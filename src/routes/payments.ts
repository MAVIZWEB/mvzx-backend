 import { Router } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { credit } from "../services/walletService";
import { assignPositionAndDistribute } from "../services/matrixService";

const prisma = new PrismaClient();
const router = Router();

function auth(req:any,res:any,next:any){
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: "unauth" });
  try { req.user = jwt.verify(t, process.env.JWT_SECRET || "dev_jwt_secret"); next(); }
  catch { return res.status(401).json({ error: "unauth" }); }
}

const LIVE = String(process.env.LIVE || "false").toLowerCase() === "true";
const MVZX_PER_USDT = 1 / 0.15;
const NGN_PER_USDT = Number(process.env.NGN_PER_USDT || 1500);

router.post("/quote", auth, async (req:any, res) => {
  const { amount, currency } = req.body;
  const usdt = currency === "USDT" ? Number(amount) : Number(amount) / NGN_PER_USDT;
  const tokens = usdt * MVZX_PER_USDT;
  const matrixBase = usdt;
  res.json({ tokens, matrixBase });
});

router.post("/create", auth, async (req:any, res) => {
  const { method, amount, currency } = req.body;
  const uid = (req.user as any).uid;

  if (!LIVE) {
    const usdt = currency === "USDT" ? Number(amount) : Number(amount) / NGN_PER_USDT;
    const tokens = usdt * MVZX_PER_USDT;
    await credit(uid, "MVZx", tokens);

    const unit = currency === "USDT" ? 1.5 : 2000;
    const positions = Math.max(1, Math.floor(Number(amount) / unit));
    for (let i = 0; i < positions; i++) {
      await assignPositionAndDistribute(uid, usdt);
    }
    return res.json({ status: "paid", positions });
  }

  // LIVE: produce deposit info or redirect
  if (method === "FLW") {
    const redirectUrl = `${process.env.PUBLIC_BASE}/payments/flw/checkout?order=ORDER_ID`;
    return res.json({ redirectUrl });
  }
  if (method === "USDT") {
    return res.json({ depositAddress: process.env.USDT_RECEIVE_WALLET });
  }
  if (method === "MANUAL") {
    return res.json({ next: "submit proof to /payments/manual/submit" });
  }
  return res.status(400).json({ error: "unknown method" });
});

// Called by watcher or other service when USDT deposit detected
router.post("/usdt/notify", async (req, res) => {
  try {
    const { userId, amountUSDT } = req.body;
    if (!userId || !amountUSDT) return res.status(400).json({ error: "missing" });

    const tokens = amountUSDT * MVZX_PER_USDT;
    await credit(userId, "MVZx", tokens);

    const units = Math.max(1, Math.floor(amountUSDT / 1.5));
    for (let i = 0; i < units; i++) await assignPositionAndDistribute(userId, amountUSDT);

    res.json({ ok: true });
  } catch (err:any) {
    res.status(500).json({ error: err.message || "notify error" });
  }
});

// Manual deposit submission (user)
router.post("/manual/submit", auth, async (req:any, res) => {
  // For now we log the submission. Admin must approve manually (extend DB later)
  try {
    console.log("Manual deposit submission:", req.body);
    res.json({ accepted: true });
  } catch (err:any) {
    res.status(500).json({ error: err.message || "manual submit error" });
  }
});

// Flutterwave verify stub (frontend should call after redirect)
router.get("/flutterwave/verify/:txid", auth, async (req:any, res) => {
  // Implement FLW verify when LIVE: call Flutterwave verify API with secret key
  res.json({ ok: true, txid: req.params.txid });
});

export default router;
