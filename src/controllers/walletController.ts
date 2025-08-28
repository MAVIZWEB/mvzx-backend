 // src/controllers/walletController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔹 Auto-create wallet when user is created
export const createWalletForUser = async (userId: number) => {
  const walletAddress = `MVZX-${Math.random().toString(36).substring(2, 12)}`;

  return prisma.wallet.create({
    data: {
      userId,
      address: walletAddress,
      balance: 0.5, // 🎁 Airdrop on signup
    },
  });
};

// 🔹 Get wallet balance
export const getWallet = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const wallet = await prisma.wallet.findUnique({
      where: { userId: Number(userId) },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch wallet", details: error.message });
  }
};

// 🔹 Credit wallet
export const creditWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;

    const wallet = await prisma.wallet.update({
      where: { userId: Number(userId) },
      data: { balance: { increment: Number(amount) } },
    });

    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to credit wallet", details: error.message });
  }
};

// 🔹 Debit wallet
export const debitWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;

    const wallet = await prisma.wallet.findUnique({
      where: { userId: Number(userId) },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { userId: Number(userId) },
      data: { balance: { decrement: Number(amount) } },
    });

    res.json(updatedWallet);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to debit wallet", details: error.message });
  }
};
