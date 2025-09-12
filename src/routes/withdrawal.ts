import express from 'express';
import prisma from '../lib/prisma';
import { sendUSDT } from '../services/walletService';

const router = express.Router();

router.post('/request', async (req, res) => {
  const { userId, amount, method, dest } = req.body;
  if (!userId || !amount || !method || !dest) return res.status(400).json({ error: 'missing' });

  const w = await prisma.withdrawal.create({ data: { userId, amount, method, dest } });
  res.json({ ok:true, withdrawal: w });
});

// Admin executes withdrawal
router.post('/execute/:id', async (req, res) => {
  const { id } = req.params;
  const w = await prisma.withdrawal.findUnique({ where: { id: Number(id) } });
  if (!w) return res.status(404).json({ error: 'not found' });
  if (w.method === 'USDT') {
    await sendUSDT(w.dest, w.amount, process.env.USDT_CONTRACT!);
    await prisma.withdrawal.update({ where:{ id: w.id }, data: { status: 'paid' } });
  } else {
    // Bank withdraw: admin manual off-chain payout then mark paid
    await prisma.withdrawal.update({ where:{ id: w.id }, data: { status: 'awaiting_admin' } });
  }
  res.json({ ok:true });
});

export default router;
