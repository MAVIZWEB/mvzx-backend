import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Admin: list pending payouts (matrix completions and withdrawal queue)
router.get('/pending', async (req, res) => {
  const pendingWithdrawals = await prisma.withdrawal.findMany({ where: { status: 'pending' } });
  const matricesReady = await prisma.matrix.findMany({ where: { legsFilled: { gte: 2 } } });
  res.json({ pendingWithdrawals, matricesReady });
});

// Admin: signal payout for a user when matrix completes
router.post('/payout-matrix/:matrixId', async (req, res) => {
  const { matrixId } = req.params;
  // For simplicity, mark matrix earnings zero and transfer balance to withdrawal queue or mark paid
  const m = await prisma.matrix.findUnique({ where: { id: Number(matrixId) } });
  if (!m) return res.status(404).json({ error: 'matrix not found' });
  // Add the earnings to user balance (already present), clear matrix earnings or set legsFilled=0
  await prisma.matrix.update({ where: { id: m.id }, data: { legsFilled: 0, earnings: 0 } });
  res.json({ ok:true });
});

export default router;
