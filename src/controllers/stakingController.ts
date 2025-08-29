 import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function startStaking(req: Request, res: Response) {
  try {
    const { userId, amount } = req.body;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 150);
    await prisma.staking.create({ data: { userId, amount, startDate, endDate, claimed: false } });
    // deduct user's balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    await prisma.wallet.update({ where: { id: wallet!.id }, data: { balanceMVZx: { decrement: amount } } });
    res.json({ ok: true, endDate });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}

export async function status(req: Request, res: Response) {
  const userId = Number(req.params.userId);
  const s = await prisma.staking.findMany({ where: { userId } });
  res.json({ staking: s });
}
