 // backend/controllers/matrixController.ts
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

/* ---------------- GET MATRIX ---------------- */
export const getMatrix = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const matrix = await prisma.matrix.findMany({
      where: { userId: Number(userId) },
      orderBy: { stage: "asc" },
    });
    res.json(matrix);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch matrix", details: err.message });
  }
};

/* ---------------- JOIN MATRIX ---------------- */
export const joinMatrix = async (req: Request, res: Response) => {
  try {
    const { userId, stage } = req.body;

    // Determine width: Stage 1 = 2x2, Stage 2-20 = 2x5
    const width = stage === 1 ? 2 : 5;

    // Find parent slot with available space
    const parentSlot = await prisma.matrix.findFirst({
      where: {
        stage,
        children: { lt: width }, // available space
      },
      orderBy: { id: "asc" },
    });

    const entry = await prisma.matrix.create({
      data: {
        userId,
        stage,
        position: parentSlot ? parentSlot.position + 1 : 1,
        earnings: 0,
        parentId: parentSlot ? parentSlot.id : null,
        children: 0,
      },
    });

    // Update parent's children count
    if (parentSlot) {
      await prisma.matrix.update({
        where: { id: parentSlot.id },
        data: { children: { increment: 1 } },
      });
    }

    // Distribute rewards (MC/JB/NSP/CR)
    await distributeMatrixReward(userId, stage);

    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to join matrix", details: err.message });
  }
};

/* ---------------- PROGRESS MATRIX ---------------- */
export const progressMatrix = async (req: Request, res: Response) => {
  try {
    const { matrixId, mc, jb, nsp, cr } = req.body;

    // Increment existing earnings
    const updated = await prisma.matrix.update({
      where: { id: matrixId },
      data: {
        earnings: { increment: mc + jb + nsp + cr },
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to progress matrix", details: err.message });
  }
};

/* ---------------- MATRIX REWARD DISTRIBUTION ---------------- */
const distributeMatrixReward = async (userId: number, stage: number) => {
  const baseAmount = 2000; // NGN per slot (can multiply by purchase multiples)
  const percentages = {
    MC: 0.162, // 16.2%
    JB: stage === 1 ? 0.10 : 0, // Only stage 1
    NSP: 0.05, // 5% next stage
    CR: 0.30, // 30% referral (example)
  };

  const rewards = {
    MC: baseAmount * percentages.MC,
    JB: baseAmount * percentages.JB,
    NSP: baseAmount * percentages.NSP,
    CR: baseAmount * percentages.CR,
  };

  // Update user's matrix earnings
  const userMatrix = await prisma.matrix.findFirst({
    where: { userId, stage },
  });
  if (userMatrix) {
    await prisma.matrix.update({
      where: { id: userMatrix.id },
      data: { earnings: { increment: rewards.MC + rewards.JB + rewards.NSP + rewards.CR } },
    });
  }

  // Update referral (parent)
  const parent = await prisma.matrix.findUnique({ where: { id: userMatrix?.parentId || 0 } });
  if (parent) {
    await prisma.matrix.update({
      where: { id: parent.id },
      data: { earnings: { increment: rewards.CR } },
    });
  }

  // Next stage purchase (NSP) can be handled automatically via purchaseService
};
