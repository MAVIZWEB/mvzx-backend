 import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

/* ---------------- GET WALLET ---------------- */
export const getWallet = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const wallet = await prisma.wallet.findUnique({
      where: { userId: Number(userId) },
    });

    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    res.json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch wallet", details: err.message });
  }
};
