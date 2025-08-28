 import express from "express";
import { PrismaClient } from "@prisma/client";
import { assignPositionAndDistribute } from "../services/matrixService";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * ✅ Purchase MVZx Tokens
 * - Min 200 Naira equivalent
 * - If >= 2000 and multiple of 2000 => matrix placement + rewards
 * - Else => only tokens + 2.5% referrer + 2.5% referral
 */
router.post("/", async (req, res) => {
  try {
    const { userId, amount, currency } = req.body; // currency: NGN or USDT

    if (!userId || !amount) {
      return res.status(400).json({ error: "userId and amount are required" });
    }

    if (amount < 200) {
      return res.status(400).json({ error: "Minimum purchase is 200 Naira" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // credit MVZx tokens = amount (for simplicity 1 Naira = 1 MVZx)
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    });

    let matrixResult = null;
    if (amount % 2000 === 0) {
      // eligible for matrix placement
      matrixResult = await assignPositionAndDistribute(userId, amount / 2000);
    } else {
      // referral bonuses only
      if (user.referrerId) {
        const commission = amount * 0.025;
        await prisma.user.update({
          where: { id: user.referrerId },
          data: { balance: { increment: commission } },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: commission } },
        });
      }
    }

    return res.json({
      success: true,
      message: "Purchase successful",
      tokensCredited: amount,
      matrixResult,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Purchase failed" });
  }
});

export default router;
