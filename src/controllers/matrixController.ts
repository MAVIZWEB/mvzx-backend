 // backend/controllers/purchaseController.ts
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { placeInMatrix } from "../services/matrixService";
import { sendMVZX } from "../services/tokenService";

// Helper: safely get slot cost from env
const getSlotCost = (): number => {
  const cost = Number(process.env.SLOT_COST_NGN || "2000");
  if (isNaN(cost) || cost <= 0) {
    throw new Error("Invalid SLOT_COST_NGN in env");
  }
  return cost;
};

// ----------------- BUY SLOT -----------------
export const buySlot = async (req: Request, res: Response) => {
  try {
    const { userId, stage } = req.body;
    if (!userId || !stage) {
      return res.status(400).json({ error: "userId and stage are required" });
    }

    // Get slot cost in NGN
    const slotCostNGN = getSlotCost();

    // Convert to USDT equivalent
    const mvzxRate = Number(process.env.MVZX_USDT_RATE || "0.15");
    const costUSDT = slotCostNGN * mvzxRate;

    // Deduct MVZX tokens from user (simulate transfer)
    await sendMVZX(userId, process.env.COMPANY_WALLET!, costUSDT);

    // Place user in matrix
    const matrixPos = await placeInMatrix(userId, stage);

    // Record purchase
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        stage,
        amount: costUSDT,
      },
    });

    res.json({
      success: true,
      message: `Slot purchased successfully at stage ${stage}`,
      purchase,
      matrixPos,
    });
  } catch (err: any) {
    console.error("BuySlot error:", err);
    res.status(500).json({ error: "Purchase failed", details: err.message });
  }
};
