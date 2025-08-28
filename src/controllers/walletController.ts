import { Request, Response } from "express";
import prisma from "../prisma"; // <- make sure you have prisma client setup
import { BigNumber } from "bignumber.js";

// Get user wallet
export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.params.userId; // fallback
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json(wallet);
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Transfer between users
export const transfer = async (req: Request, res: Response) => {
  try {
    const senderId = (req as any).user?.id;
    const { recipientId, amount } = req.body;

    if (!recipientId || !amount) {
      return res.status(400).json({ error: "Recipient and amount required" });
    }

    const amt = new BigNumber(amount);
    if (amt.lte(0)) return res.status(400).json({ error: "Invalid amount" });

    const senderWallet = await prisma.wallet.findUnique({ where: { userId: senderId } });
    if (!senderWallet || new BigNumber(senderWallet.balance).lt(amt)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: new BigNumber(senderWallet.balance).minus(amt).toString() },
      });

      const recipientWallet = await tx.wallet.upsert({
        where: { userId: recipientId },
        create: { userId: recipientId, balance: amt.toString() },
        update: { balance: { increment: amt.toNumber() } },
      });

      return recipientWallet;
    });

    res.json({ message: "Transfer successful", recipient: result });
  } catch (error) {
    console.error("Error during transfer:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Withdraw request
export const withdraw = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { amount, bankDetails } = req.body;

    if (!amount || !bankDetails) {
      return res.status(400).json({ error: "Amount and bank details required" });
    }

    const amt = new BigNumber(amount);
    if (amt.lte(0)) return res.status(400).json({ error: "Invalid amount" });

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || new BigNumber(wallet.balance).lt(amt)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance + create withdrawal record
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: new BigNumber(wallet.balance).minus(amt).toString() },
      });

      await tx.withdrawal.create({
        data: {
          userId,
          amount: amt.toString(),
          bankDetails,
          status: "PENDING",
        },
      });
    });

    res.json({ message: "Withdrawal request submitted" });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    res.status(500).json({ error: "Server error" });
  }
};
