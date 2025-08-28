import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { assignPositionAndDistribute } from "../services/matrixService";

const prisma = new PrismaClient();
const router = Router();

// --- PURCHASE TOKENS ---
router.post("/purchase", async (req, res) => {
  try {
    const { userId, amount, paymentMethod } = req.body;

    if (amount < 200) {
      return res.status(400).json({ error: "Minimum purchase is ₦200" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate tokens: assume 1 MVZx = ₦1 for now
    const tokens = amount;

    // Credit wallet balance
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: tokens } },
    });

    // Check if qualifies for Matrix (multiples of 2000)
    if (amount % 2000 === 0) {
      await assignPositionAndDistribute(userId, amount / 2000);
    }

    res.json({
      success: true,
      message:
        amount % 2000 === 0
          ? "Purchase successful. Matrix position assigned."
          : "Purchase successful. Tokens credited (no matrix placement).",
      tokens,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
