 import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Wallet balance
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await prisma.wallet.findUnique({ where: { userId: Number(userId) } });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: "Balance fetch failed" });
  }
});

// Internal transfer
router.post("/transfer", async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body;
    if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const fromWallet = await prisma.wallet.findUnique({ where: { userId: fromUserId } });
    const toWallet = await prisma.wallet.findUnique({ where: { userId: toUserId } });

    if (!fromWallet || !toWallet) return res.status(404).json({ error: "Wallet not found" });
    if (fromWallet.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    await prisma.wallet.update({ where: { id: fromWallet.id }, data: { balance: { decrement: amount } } });
    await prisma.wallet.update({ where: { id: toWallet.id }, data: { balance: { increment: amount } } });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Transfer failed" });
  }
});

export default router;
