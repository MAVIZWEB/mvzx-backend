// src/routes/payments.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { credit } from "../services/walletService";
import { assignPositionAndDistribute } from "../services/matrixService";

const prisma = new PrismaClient();
const router = Router();

function auth(req:any,res:any,next:any){
  const h = req.headers.authorization || ""; const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if(!t) return res.status(401).json({error:"unauth"}); try{ req.user = jwt.verify(t, process.env.JWT_SECRET!); next(); }catch(e){return res.status(401).json({error:"unauth"})}
}

const LIVE = String(process.env.LIVE || "false").toLowerCase() === "true";
const MVZX_PER_USDT = 1 / 0.15;
const NGN_PER_USDT = Number(process.env.NGN_PER_USDT || 1500);

router.post("/quote", auth, async (req:any, res) => {
  const { amount, currency } = req.body as any;
  const usdt = currency === "USDT" ? Number(amount) : Number(amount) / NGN_PER_USDT;
  const tokens = usdt * MVZX_PER_USDT;
  const matrixBase = usdt;
  res.json({ tokens, matrixBase });
});

router.post("/create", auth, async (req:any, res) => {
  const { method, amount, currency } = req.body as any;
  const uid = (req.user as any).uid;

  if (!LIVE) {
    // SIMULATION: instantly credit and assign matrix positions
    const usdt = currency==="USDT"? Number(amount) : Number(amount) / NGN_PER_USDT;
    const tokens = usdt * MVZX_PER_USDT;
    await credit(uid, "MVZx", tokens);
    const unit = currency==="USDT"? 1.5 : 2000;
    const positions = Math.max(1, Math.floor(Number(amount) / unit));
    for (let i=0;i<positions;i++) {
      await assignPositionAndDistribute(uid, usdt);
    }
    return res.json({ status:"paid", positions });
  }

  // LIVE: produce deposit details or redirect link
  if (method === "FLW") {
    // create Flutterwave charge with secret keys (SDK usage recommended)
    // Save order to DB then return redirectUrl.
    const redirectUrl = `${process.env.PUBLIC_BASE}/payments/flw/checkout?order=ORDER_ID`;
    return res.json({ redirectUrl });
  }
  if (method === "USDT") {
    // For simple implementation: return company USDT receive wallet (configured in ENV)
    return res.json({ depositAddress: process.env.USDT_RECEIVE_WALLET });
  }
  if (method === "MANUAL") {
    return res.json({ next: "submit proof to /payments/manual/submit" });
  }
  return res.status(400).json({ error:"unknown method" });
});

// USDT on-chain notify -> call this when you detect a confirmed USDT transfer to your receive wallet
router.post("/usdt/notify", async (req, res) => {
  // body: { userId, amountUSDT, txHash }
  const { userId, amountUSDT } = req.body as any;
  if(!userId || !amountUSDT) return res.status(400).json({ error:"missing" });
  const tokens = amountUSDT * MVZX_PER_USDT;
  await credit(userId, "MVZx", tokens);
  const units = Math.max(1, Math.floor(amountUSDT / 1.5));
  for (let i=0;i<units;i++) await assignPositionAndDistribute(userId, amountUSDT);
  return res.json({ ok:true });
});

// Manual deposit submit (user)
router.post("/manual/submit", auth, async (req:any,res) => {
  const uid = (req.user as any).uid;
  const { payerName, receiptDate, receiptTime, phone, amount } = req.body;
  // Save to DB for admin review (create a manual_deposit table in production)
  await prisma.$executeRaw`INSERT INTO ManualDeposit(userId, payerName, receiptDate, receiptTime, phone, amount, status) VALUES(${uid}, ${payerName}, ${receiptDate}, ${receiptTime}, ${phone}, ${amount}, 'pending')`;
  return res.json({ accepted:true });
});

// Flutterwave verification endpoint (called by frontend after redirect)
router.get("/flutterwave/verify/:txid", auth, async (req:any,res) => {
  const txid = req.params.txid;
  // call Flutterwave verify endpoint using your FLW secret key (LIVE only)
  // Pseudo: const verified = await verifyWithFlutter(txid)
  // if verified: compute usdt amount, credit user, assignPositionAndDistribute
  res.json({ ok: true, txid });
});

export default router;
