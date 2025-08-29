 // backend/src/routes/stake.ts
import { Router } from "express";
import { addDays } from "date-fns";
import { prisma } from "../prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// create stake
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const userId = req.userId!;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Invalid amount" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).json({ error: "User not found" });
    if (Number(user.mvzxBalance) < Number(amount)) return res.status(400).json({ error: "Insufficient MVZx balance" });

    const endDate = addDays(new Date(), 150);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { mvzxBalance: { decrement: amount } },
      }),
      prisma.stake.create({
        data: {
          userId,
          amount,
          endDate,
        }
      })
    ]);

    res.json({ success: true, message: "Stake created", endDate });
  } catch (e) {
    console.error("stake create", e);
    res.status(500).json({ error: "Staking failed" });
  }
});

// claim stake
router.post("/claim", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { stakeId } = req.body;
    const userId = req.userId!;
    const stake = await prisma.stake.findUnique({ where: { id: stakeId } });
    if (!stake || stake.userId !== userId) return res.status(404).json({ error: "Stake not found" });
    if (stake.claimed) return res.status(400).json({ error: "Already claimed" });
    if (new Date() < new Date(stake.endDate)) return res.status(400).json({ error: "Stake not matured" });

    const payout = Number(stake.amount) * 2; // 100% return
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { mvzxBalance: { increment: payout } },
      }),
      prisma.stake.update({
        where: { id: stakeId },
        data: { claimed: true },
      })
    ]);

    res.json({ success: true, payout });
  } catch (e) {
    console.error("stake claim", e);
    res.status(500).json({ error: "Claim failed" });
  }
});

export default router;
