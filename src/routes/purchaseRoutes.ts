 // backend/src/routes/purchase.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { assignPositionAndDistribute } from "../services/matrixService";
import { sendMVZX } from "../services/tokenService";

const router = Router();

const SLOT_COST_NGN = Number(process.env.SLOT_COST_NGN || 2000);
const MVZX_USDT_RATE = Number(process.env.MVZX_USDT_RATE || 0.15); // USDT per MVZX
const NGN_PER_USDT = Number(process.env.NGN_PER_USDT || 1500);
const LIVE = process.env.LIVE === "true";

// Convert NGN to MVZX tokens
function ngnToMvzx(amountNGN: number) {
  const pricePerMVZX_NGN = MVZX_USDT_RATE * NGN_PER_USDT;
  return Number((amountNGN / pricePerMVZX_NGN).toFixed(8));
}

// helper to credit MVZX to user (onchain if LIVE else update DB)
async function creditTokensToUser(userId: number, tokens: number, walletAddress?: string) {
  if (LIVE) {
    // attempt onchain transfer using COMPANY_WALLET admin wallet (sendMVZX expects recipient and token amount)
    const txHash = await sendMVZX(walletAddress || "0x0", tokens);
    // do NOT increment DB balance in live mode (on-chain is source of truth)
    // But we still record the purchase and return txHash
    return txHash;
  } else {
    // simulate: increment mvzxBalance in DB
    await prisma.user.update({ where: { id: userId }, data: { mvzxBalance: { increment: tokens } } });
    return `SIM_${Date.now()}`;
  }
}

/**
 * POST /api/purchase
 * body: { amountNGN, method: "USDT"|"FLW"|"BANK", txHash? }
 * Auth required
 */
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { amountNGN, method, txHash } = req.body;
    if (!amountNGN || Number(amountNGN) < 200) return res.status(400).json({ error: "Minimum purchase N200" });

    const tokens = ngnToMvzx(Number(amountNGN));
    const matrixEligible = Number(amountNGN) >= 2000 && Number(amountNGN) % SLOT_COST_NGN === 0;
    const units = Math.floor(Number(amountNGN) / SLOT_COST_NGN); // number of slots
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Create Purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        amountNGN: Number(amountNGN),
        amountUSDT: Number((Number(amountNGN) / NGN_PER_USDT).toFixed(8)),
        tokensMVZX: Number(tokens),
        method,
        matrixEligible,
        txHash: txHash || null,
      }
    });

    // credit tokens
    const tx = await creditTokensToUser(userId, tokens, user?.wallet || undefined);

    // Referral bonus logic: if matrix NOT eligible (or always?), rules say ANY amount not multiple should still get tokens AND
    // 2.5% to buyer (referral), and 2.5% to referrer whose link was used.
    // We'll grant this bonus for non-multiples OR as policy for all purchases (safe approach): only when purchase is NOT matrixEligible.
    if (!matrixEligible) {
      // buyer bonus (2.5%) credited to their balance as tokens
      const buyerBonusNGN = Number(amountNGN) * 0.025;
      const buyerBonusTokens = ngnToMvzx(buyerBonusNGN);
      await creditTokensToUser(userId, buyerBonusTokens, user?.wallet || undefined);

      // referrer bonus
      if (user?.referredById) {
        const refUser = await prisma.user.findUnique({ where: { id: user.referredById } });
        if (refUser) {
          const refBonusNGN = Number(amountNGN) * 0.025;
          const refBonusTokens = ngnToMvzx(refBonusNGN);
          await creditTokensToUser(refUser.id, refBonusTokens, refUser.wallet);
        }
      }
    }

    // If matrixEligible, assign matrix positions per unit and compute reward credits
    let matrixResult: any = null;
    if (matrixEligible && units > 0) {
      matrixResult = await assignPositionAndDistribute(userId, units, SLOT_COST_NGN);
    }

    res.json({ success: true, purchase, tx, matrixResult });
  } catch (e: any) {
    console.error("purchase error", e);
    res.status(500).json({ error: e.message || "Purchase failed" });
  }
});

export default router;
