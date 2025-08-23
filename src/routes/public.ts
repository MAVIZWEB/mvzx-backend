 import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// lightweight leaderboard memory (swap for DB later)
const memoryBoard: any[] = [];

router.get("/leaderboard", (_req, res) => {
  res.json({ items: memoryBoard.slice(-10).reverse() });
});

// lookup user by wallet address (used by watcher)
router.get("/lookup-wallet", async (req, res) => {
  const wallet = String(req.query.wallet || "").toLowerCase();
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  const user = await prisma.user.findFirst({ where: { wallet } });
  if (!user) return res.json({ found: false });
  res.json({ found: true, userId: user.id, wallet: user.wallet });
});

export default router;
