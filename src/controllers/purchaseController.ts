 import { Request, Response } from "express";
import { prisma } from "../prisma";
import { assignPositionAndDistribute } from "../services/matrixService";
import { transferMVZX } from "../services/tokenService";

export async function purchase(req: Request, res: Response) {
  const { userId, amount, currency } = req.body;

  if (amount < 200) return res.status(400).json({ error: "Minimum 200 Naira required" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  let matrixEligible = amount >= 2000 && amount % 2000 === 0;

  const purchase = await prisma.purchase.create({
    data: { userId, amount, currency, matrixAssigned: matrixEligible }
  });

  const mvzxTokens = amount * 0.001; // Example conversion
  await transferMVZX(user.wallet, mvzxTokens);

  if (matrixEligible) {
    await assignPositionAndDistribute(userId, mvzxTokens);
  }

  res.json({ success: true, tokens: mvzxTokens, matrixAssigned: matrixEligible });
}
