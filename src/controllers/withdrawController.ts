 // backend/controllers/withdrawController.ts
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { sendMVZX } from "../services/tokenService";

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const { userId, amount, method } = req.body;
    if (!userId || !amount || !method) {
      return res.status(400).json({ error: "userId, amount, and method are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check balance
    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount,
        method, // e.g., USDT, MVZX, Flutterwave bank
        status: "pending",
      },
    });

    // Auto-process for crypto withdrawals
    if (method === "USDT" || method === "MVZX") {
      await sendMVZX(process.env.COMPANY_WALLET!, user.wallet, amount);
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "completed" },
      });
    }

    res.json({
      success: true,
      message: `Withdrawal of ${amount} via ${method} requested successfully`,
      balance: updatedUser.balance,
    });
  } catch (err: any) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ error: "Withdrawal failed", details: err.message });
  }
};
