// backend/src/routes/admin.ts
import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// Approve a bank purchase (mark purchase.matrixEligible true and process as if successful)
router.post("/approve-bank", async (req, res) => {
  try {
    const { purchaseId } = req.body;
    if (!purchaseId) return res.status(400).json({ error: "purchaseId required" });

    const purchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { matrixEligible: true },
    });

    // optionally: process matrix assignment now
    // For simplicity, admin will call /api/purchase with same payload or we can trigger matrix service here
    res.json({ success: true, purchase });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Approve failed" });
  }
});

// Trigger lump-sum payout for a user's completed matrix (combines pendingNGN -> creditedNGN, then convert to tokens)
router.post("/pay-matrix-lumpsum", async (req, res) => {
  try {
    const { matrixId } = req.body;
    if (!matrixId) return res.status(400).json({ error: "matrixId required" });

    const matrix = await prisma.matrix.findUnique({ where: { id: matrixId } });
    if (!matrix) return res.status(404).json({ error: "Matrix not found" });

    // move pendingNGN to creditedNGN and reset pending
    const pending = Number(matrix.pendingNGN);
    if (pending <= 0) return res.status(400).json({ error: "No pending to pay" });

    await prisma.matrix.update({
      where: { id: matrixId },
      data: { creditedNGN: { increment: pending }, pendingNGN: 0 }
    });

    // Optionally convert NGN to tokens and credit user - we'll credit MVZX tokens in simulation using same conversion as purchase
    const MVZX_USDT_RATE = Number(process.env.MVZX_USDT_RATE || 0.15);
    const NGN_PER_USDT = Number(process.env.NGN_PER_USDT || 1500);
    const pricePerMVZX = MVZX_USDT_RATE * NGN_PER_USDT;
    const tokens = Number((pending / pricePerMVZX).toFixed(8));

    // credit tokens by updating user balance in simulation
    await prisma.user.update({ where: { id: matrix.userId }, data: { mvzxBalance: { increment: tokens } } });

    res.json({ success: true, matrixId, paidNGN: pending, paidTokens: tokens });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Pay failed" });
  }
});

export default router;
