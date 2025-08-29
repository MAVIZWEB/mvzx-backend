 import { Request, Response } from "express";
import prisma from "../prisma";

export async function getMyMatrix(req: Request, res: Response) {
  const userId = Number(req.params.userId);
  const rows = await prisma.matrix.findMany({ where: { userId }, orderBy: { stage: "asc" } });
  res.json({ success: true, matrix: rows });
}

export async function adminRelease(req: Request, res: Response) {
  const { userId, stage } = req.body as { userId: number; stage: number };
  const m = await prisma.matrix.findFirst({ where: { userId, stage } });
  if (!m) return res.status(404).json({ error: "Matrix stage not found" });
  const pending = Number(m.pendingNGN);
  await prisma.matrix.update({ where: { id: m.id }, data: { pendingNGN: 0 } });
  await prisma.user.update({ where: { id: userId }, data: { mvzxBalance: { increment: pending } } });
  res.json({ success: true, released: pending });
}
