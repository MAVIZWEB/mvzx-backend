 import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { sendMVZX } from "../services/tokenService";

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const { userId, amount, method } = req.body;
    if (!userId || !amount || !method) return res.status(400).json({ error: "Missing params" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });

    const withdrawal = await prisma.withdrawal.create({
      data: { userId, amount, method, status: "pending" },
    });

    if (method === "USDT" || method === "MVZX") {
      await sendMVZX(process.env.COMPANY_WALLET!, user.wallet, amount);
      await prisma.withdrawal.update({ where: { id: withdrawal.id }, data: { status: "completed" } });
    }

    res.json({ success: true, message: "Withdrawal requested", balance: user.balance - amount });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
