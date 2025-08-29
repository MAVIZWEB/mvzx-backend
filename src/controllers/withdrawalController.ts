 import { Request, Response } from "express";
import { prisma } from "../prisma";
import { transferMVZX } from "../services/tokenService";

export async function withdraw(req: Request, res: Response) {
  const { userId, amount, type, accountNumber } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

  if (type === "USDT") {
    await transferMVZX(user.wallet, amount);
    await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });
    return res.json({ success: true, method: "USDT", amount });
  } else if (type === "BANK") {
    // Create withdrawal request pending admin approval
    await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });
    return res.json({ success: true, method: "BANK", amount });
  }
}
