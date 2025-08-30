import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    (req as any).user = user;
    next();
  });
};

// Get wallet balance
router.get('/balance', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).user.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true, lockedBalance: true, stakedBalance: true }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      availableBalance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      stakedBalance: wallet.stakedBalance,
      totalBalance: wallet.balance + wallet.lockedBalance + wallet.stakedBalance
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet transactions
router.get('/transactions', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get purchases
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      select: { amount: true, currency: true, createdAt: true, status: true }
    });

    // Get earnings
    const earnings = await prisma.earning.findMany({
      where: { userId },
      select: { amount: true, type: true, description: true, createdAt: true }
    });

    // Get withdrawals
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      select: { amount: true, method: true, status: true, createdAt: true }
    });

    // Combine and sort all transactions
    const transactions = [
      ...purchases.map(p => ({ ...p, type: 'purchase', date: p.createdAt })),
      ...earnings.map(e => ({ ...e, type: 'earning', date: e.createdAt })),
      ...withdrawals.map(w => ({ ...w, type: 'withdrawal', date: w.createdAt }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ transactions });
  } catch (error) {
    console.error('Wallet transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
