import express from 'express';
import prisma from '../lib/prisma';
import { assignPositionAndDistribute } from '../services/matrixService';

const router = express.Router();

const SLOT_COST_NGN = Number(process.env.SLOT_COST_NGN || 2000);
const MVZX_USDT_RATE = Number(process.env.MVZX_USDT_RATE || 0.15);
const NGN_PER_USDT = Number(process.env.NGN_PER_USDT || 1500);

// Create purchase (frontend will call to create payment intent)
router.post('/create', async (req, res) => {
  try {
    const { userId, amountNGN, method, txHash } = req.body;
    if (!userId || !amountNGN) return res.status(400).json({ error: 'missing' });

    // Convert to USDT equivalent
    const amountUSDT = amountNGN / NGN_PER_USDT;

    // Units: how many full SLOT_COST_NGN units
    const units = Math.floor(amountNGN / SLOT_COST_NGN);

    const purchase = await prisma.purchase.create({ data: { userId, amountNGN, amountUSDT, units, paymentMethod: method, txHash } });

    // If units > 0, for each unit assign position and distribute
    if (units > 0) {
      for (let i=0;i<units;i++) {
        // matrixBase: use per-unit USDT equivalent OR per-unit MVZx tokens? We'll treat per unit as equivalent USDT value: SLOT_COST_NGN / NGN_PER_USDT
        const matrixBase = SLOT_COST_NGN / NGN_PER_USDT * MVZX_USDT_RATE; // example base
        await assignPositionAndDistribute(userId, matrixBase);
      }
    }

    // handle leftover fractional naira: still credit tokens and referral split 2.5% each if amount >=200
    const remainder = amountNGN % SLOT_COST_NGN;
    if (remainder >= 200) {
      const buyerRefReward = amountNGN * 0.025;
      // credit to buyer (user) and credited to referrer (if any)
      await prisma.user.update({ where: { id: userId }, data: { balanceMVZx: { increment: buyerRefReward / NGN_PER_USDT / MVZX_USDT_RATE } } });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.referrerId) {
        await prisma.user.update({ where: { id: user.referrerId }, data: { balanceMVZx: { increment: buyerRefReward / NGN_PER_USDT / MVZX_USDT_RATE } } });
      }
    }

    res.json({ ok:true, purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

export default router;
