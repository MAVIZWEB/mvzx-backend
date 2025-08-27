 import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function myMatrix(req: Request, res: Response) {
  try {
    const uid = (req as any).user.id;
    const positions = await prisma.matrixPosition.findMany({ where: { userId: uid }, orderBy: [{ stage: 'asc' }, { id: 'asc' }] });
    const rewards = await prisma.reward.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' } });
    return res.json({ positions, rewards });
  } catch (e:any) { console.error(e); return res.status(500).json({ error: e.message || 'server error' }); }
}

export async function myRewards(req: Request, res: Response) {
  try {
    const uid = (req as any).user.id;
    const rewards = await prisma.reward.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }});
    return res.json(rewards);
  } catch (e:any) { console.error(e); return res.status(500).json({ error: e.message || 'server error' }); }
}
