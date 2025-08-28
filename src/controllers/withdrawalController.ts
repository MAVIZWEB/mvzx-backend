 // backend/controllers/withdrawController.ts
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { sendMVZX } from "../services/tokenService";

const prisma = new PrismaClient();

/* ---------------- CREATE WITHDRAWAL ---------------- */
export const createWithdrawal = async (req: Request, res: Response) => {
  try {
    const { userId, amount, method, destination } = req.body;

    if (!userId || !amount || !method) {
      return res.status(400).json({ error: "userId, amount, and method are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check balance
    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: amount } },
    });

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: { userId: user.id, amount, method, destination, status: "pending" },
    });

    // Auto-process crypto withdrawals
    if (method === "USDT" || method === "MVZX") {
      if (!user.wallet) throw new Error("User wallet not set");
      await sendMVZX(process.env.COMPANY_WALLET!, user.wallet, amount);

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "completed" },
      });
    }

    res.json({
      success: true,
      message: `Withdrawal of ${amount} via ${method} created successfully`,
      withdrawal,
      balance: user.balance - amount,
    });
  } catch (err: any) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ error: "Failed to request withdrawal", details: err.message });
  }
};

/* ---------------- GET WITHDRAWALS ---------------- */
export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: Number(userId) },
    });

    res.json(withdrawals);
  } catch (err: any) {
    console.error("Get withdrawals error:", err);
    res.status(500).json({ error: "Failed to fetch withdrawals", details: err.message });
  }
};
