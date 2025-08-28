 import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { placeInMatrix } from "../services/matrixService";
import { transferMVZX } from "../services/tokenService";

const SLOT_COST_NGN = Number(process.env.SLOT_COST_NGN || 2000);
const MVZX_USDT_RATE = Number(process.env.MVZX_USDT_RATE || 0.15);

export const buySlot = async (req: Request, res: Response) => {
  try {
    const { userId, stage } = req.body;
    if (!userId || !stage) return res.status(400).json({ error: "userId and stage required" });

    const costUSDT = SLOT_COST_NGN * MVZX_USDT_RATE;

    // Transfer MVZX from company wallet to user
    await transferMVZX(process.env.COMPANY_WALLET!, userId.toString(), costUSDT);

    // Place in matrix
    const matrixSlot = await placeInMatrix(userId, stage);

    // Record purchase
    const purchase = await prisma.purchase.create({ data: { userId, stage, amount: costUSDT } });

    res.json({ success: true, purchase, matrixSlot });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
