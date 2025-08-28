 import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

/* ---------------- REQUEST WITHDRAWAL ---------------- */
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const { userId, amount, method, destination } = req.body;

    const withdrawal = await prisma.withdrawal.create({
      data: { userId, amount, method, destination },
    });

    res.json(withdrawal);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to request withdrawal", details: err.message });
  }
};

/* ---------------- GET WITHDRAWALS ---------------- */
export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: Number(userId) },
    });

    res.json(withdrawals);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch withdrawals", details: err.message });
  }
};
