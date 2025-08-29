 import { Response } from "express";
import prisma from "../prisma";
import { AuthedRequest } from "../middlewares/authMiddleware";

export async function requestWithdrawal(req: AuthedRequest, res: Response) {
  const { method, amountMVZX, bankName, bankAccount, usdtAddress } = req.body as {
    method: "BANK" | "USDT";
    amountMVZX: number;
    bankName?: string; bankAccount?: string; usdtAddress?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (Number(user.mvzxBalance) < amountMVZX) return res.status(400).json({ error: "Insufficient balance" });

  const w = await prisma.withdrawal.create({
    data: {
      userId: user.id,
      amountMVZX,
      method,
      bankName: bankName || null,
      bankAccount: bankAccount || null,
      usdtAddress: usdtAddress || null
    }
  });

  await prisma.user.update({ where: { id: user.id }, data: { mvzxBalance: { decrement: amountMVZX } } });
  res.json({ success: true, withdrawalId: w.id, status: w.status });
}
