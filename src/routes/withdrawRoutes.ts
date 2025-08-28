 import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Withdrawal request
router.post("/", async (req, res) => {
  try {
    const { userId, amount, method, details } = req.body;

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    });

    const withdrawal = await prisma.withdrawal.create({
      data: { userId, amount, method, details, status: "pending" },
    });

    res.json({ success: true, withdrawal });
  } catch (err) {
    res.status(500).json({ error: "Withdrawal failed" });
  }
});

export default router;
