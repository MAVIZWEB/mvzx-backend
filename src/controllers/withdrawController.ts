 import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function requestWithdrawal(req: Request, res: Response) {
  try {
    const { userId, amount, method, destination } = req.body;

    const userWallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!userWallet || userWallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });

    const withdrawal = await prisma.withdrawal.create({
      data: { userId, amount, method, destination, status: "pending" },
    });

    res.json({ success: true, withdrawal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
