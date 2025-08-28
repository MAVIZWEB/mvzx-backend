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

    if (amount >= 2000 && amount % 2000 === 0) {
      // Matrix MLM purchase
      const matrixBase = amount; // base in NGN or USDT equivalent
      result = await assignPositionAndDistribute(userId, matrixBase);

      // Update wallet balance (upsert if wallet does not exist yet)
      await prisma.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: {
          userId,
          balance: amount,
          address: "0xTEMP_ADDRESS" // replace with actual generated wallet address
        }
      });
    } else {
      // Affiliate-only reward
      result = await processAffiliateReward(userId, amount);

      // Still credit tokens to wallet
      await prisma.wallet.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: {
          userId,
          balance: amount,
          address: "0xTEMP_ADDRESS" // replace with actual generated wallet address
        }
      });
    }

    return res.json({ success: true, result });
  } catch (err: any) {
    console.error("Purchase error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
