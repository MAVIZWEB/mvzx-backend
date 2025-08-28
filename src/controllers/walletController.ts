 import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

// 🔹 Utility: generate pseudo wallet address (you can switch to Web3 provider later)
function generateWalletAddress() {
  return "MVZX-" + randomBytes(16).toString("hex");
}

// ✅ Get wallet balance by userId
export const getWallet = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const wallet = await prisma.wallet.findUnique({
      where: { userId: Number(userId) },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    return res.json(wallet);
  } catch (error) {
    console.error("getWallet error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Create wallet (auto-called at signup, but also exposed here for admin/debug)
export const createWallet = async (userId: number) => {
  const newWallet = await prisma.wallet.create({
    data: {
      userId,
      address: generateWalletAddress(),
      balance: 0.5, // 🎁 auto-airdrop on creation
    },
  });
  return newWallet;
};

// ✅ Credit wallet
export const creditWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;

    const wallet = await prisma.wallet.update({
      where: { userId: Number(userId) },
      data: { balance: { increment: Number(amount) } },
    });

    return res.json(wallet);
  } catch (error) {
    console.error("creditWallet error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Debit wallet (for withdrawals/purchases)
export const debitWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;

    const wallet = await prisma.wallet.findUnique({
      where: { userId: Number(userId) },
    });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { userId: Number(userId) },
      data: { balance: { decrement: Number(amount) } },
    });

    return res.json(updatedWallet);
  } catch (error) {
    console.error("debitWallet error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
