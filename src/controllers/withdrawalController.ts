 // backend/controllers/withdrawController.ts
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { sendMVZx, sendUSDT } from "../services/tokenService";

const prisma = new PrismaClient();

/* ---------------- CREATE WITHDRAWAL ---------------- */
export const createWithdrawal = async (req: Request, res: Response) => {
  try {
    const { userId, amount, method, destination } = req.body;

    if (!userId || !amount || !method || !destination) {
      return res.status(400).json({ error: "userId, amount, method, and destination are required" });
    }

    // Find user including wallet
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: { wallet: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.wallet) return res.status(400).json({ error: "User wallet not set" });

    // Check balance
    if (user.wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance
    const updatedWallet = await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: { decrement: amount } },
    });

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: { userId: user.id, amount, method, destination, status: "pending" },
    });

    let txHash: string | null = null;

    // Auto-process crypto withdrawals
    if (method === "MVZx") {
      txHash = await sendMVZx(destination, amount);
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "completed" },
      });
    } else if (method === "USDT") {
      txHash = await sendUSDT(destination, amount);
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "completed" },
      });
    } else if (method === "FLUTTERWAVE") {
      // Leave pending for admin approval
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "pending" },
      });
    } else {
      return res.status(400).json({ error: "Unsupported withdrawal method" });
    }

    res.json({
      success: true,
      message: `Withdrawal of ${amount} via ${method} created successfully`,
      withdrawal,
      balance: updatedWallet.balance,
      txHash,
      status: method === "FLUTTERWAVE" ? "pending" : "completed",
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

    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: Number(userId) },
    });

    res.json(withdrawals);
  } catch (err: any) {
    console.error("Get withdrawals error:", err);
    res.status(500).json({ error: "Failed to fetch withdrawals", details: err.message });
  }
};
