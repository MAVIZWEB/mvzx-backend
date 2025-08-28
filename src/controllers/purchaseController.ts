 // src/controllers/purchaseController.ts
import { Request, Response } from "express";
import { assignPositionAndDistribute } from "../services/matrixService";
import { processAffiliateReward } from "../services/affiliateRewardService";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function purchaseMVZx(req: Request, res: Response) {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ success: false, message: "UserId and amount required" });
    }

    if (amount < 200) {
      return res.status(400).json({ success: false, message: "Minimum purchase is ₦200" });
    }

    let result;
    if (amount % 2000 === 0 && amount >= 2000) {
      // Matrix MLM purchase
      const matrixBase = amount; // base in NGN or USDT equiv
      result = await assignPositionAndDistribute(userId, matrixBase);

      // Credit tokens equal to amount
      await prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } }
      });
    } else {
      // Affiliate-only reward
      result = await processAffiliateReward(userId, amount);
    }

    return res.json({ success: true, result });
  } catch (err: any) {
    console.error("Purchase error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
