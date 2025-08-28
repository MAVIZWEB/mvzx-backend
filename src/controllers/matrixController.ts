 import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

/* ---------------- GET MATRIX ---------------- */
export const getMatrix = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const matrix = await prisma.matrix.findMany({
      where: { userId: Number(userId) },
    });
    res.json(matrix);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch matrix", details: err.message });
  }
};

/* ---------------- JOIN MATRIX ---------------- */
export const joinMatrix = async (req: Request, res: Response) => {
  try {
    const { userId, stage, position } = req.body;

    const entry = await prisma.matrix.create({
      data: { userId, stage, position },
    });

    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to join matrix", details: err.message });
  }
};

/* ---------------- PROGRESS MATRIX ---------------- */
export const progressMatrix = async (req: Request, res: Response) => {
  try {
    const { matrixId, earnings } = req.body;

    const updated = await prisma.matrix.update({
      where: { id: matrixId },
      data: { earnings },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to progress matrix", details: err.message });
  }
};
