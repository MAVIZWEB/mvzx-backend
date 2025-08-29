 import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function getUserMatrix(req: Request, res: Response) {
  const userId = Number(req.params.userId);
  const stages = await prisma.matrix.findMany({ where: { userId }, orderBy: { stage: 'asc' } });
  res.json({ stages });
}
