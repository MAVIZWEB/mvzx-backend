import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function requestWithdraw(req: Request, res: Response) {
  try {
    const uid = (req as any).user.id;
    const { currency, amount, method, details } = req.body;
    if(!currency || !amount || !method) return res.status(400).json({ error: 'invalid payload' });
    const w = await prisma.withdrawal.create({
      data: { userId: uid, currency, amount: amount.toString(), method, details }
    });
    return res.json(w);
  } catch (e:any) { console.error(e); return res.status(500).json({ error: e.message || 'server error' }); }
}
