 import express from "express";
import { PrismaClient } from "@prisma/client";
import { assignPositionAndDistribute } from "../services/matrixService";

const prisma = new PrismaClient();
const router = express.Router();

// Token purchase
router.post("/purchase", async (req, res) => {
  try {
    const { userId, amount, currency, txRef } = req.body;
    if (amount < 200) {
      return res.status(400).json({ error: "Minimum purchase is 200 NGN" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user || !user.wallet) return res.status(404).json({ error: "User not found" });

    // Save purchase
    const purchase = await prisma.purchase.create({
      data: { userId, amount, currency, txRef, status: "confirmed" },
    });

    // Update wallet with tokens
    await prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { balance: { increment: amount } }, // 1 NGN = 1 MVZx (simplified)
    });

    // Referral: 2.5% to buyer, 2.5% to referrer
    const referral = await prisma.referral.findFirst({ where: { userId } });
    if (referral) {
      await prisma.wallet.update({
        where: { userId: referral.referrerId },
        data: { balance: { increment: amount * 0.025 } },
      });
      await prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: amount * 0.025 } },
      });
    }

    // Only multiples of 2000 NGN enter matrix
    if (amount % 2000 === 0) {
      await assignPositionAndDistribute(userId, 2000);
    }

    res.json({ success: true, purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Purchase failed" });
  }
});

export default router;
