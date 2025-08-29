 import { Request, Response } from "express";
import { prisma } from "../prisma";

export async function getMatrix(req: Request, res: Response) {
  const { userId } = req.params;
  const matrix = await prisma.matrix.findMany({ where: { userId: Number(userId) } });
  res.json({ success: true, matrix });
}
