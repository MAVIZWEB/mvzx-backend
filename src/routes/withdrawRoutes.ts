import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * ✅ Withdraw route
 * - Supports NGN bank transfer OR USDT
 */
router.post("/", async (req, res) => {
  try {
    const { userId, amount, method, account } = req.body;

    if (!userId || !amount || !method) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // deduct immediately
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    // record withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount,
        method, // "bank" or "usdt"
        account, // bank acct or USDT wallet
        status: "pending",
      },
    });

    return res.json({
      success: true,
      message: "Withdrawal request submitted",
      withdrawal,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Withdrawal failed" });
  }
});

export default router;
