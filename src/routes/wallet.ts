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
    req.user = user;
    next();
  });
};

// Get wallet balance
router.get('/balance', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ balance: wallet.balance });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet transactions
router.get('/transactions', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.userId;

    // Get purchases, earnings, and withdrawals
    const [purchases, earnings, withdrawals] = await Promise.all([
      prisma.purchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.earning.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Combine and sort transactions
    const transactions = [
      ...purchases.map((p: any) => ({
        type: 'purchase',
        amount: -p.amount,
        description: `Purchase of ${p.amount} ${p.currency}`,
        date: p.createdAt
      })),
      ...earnings.map((e: any) => ({
        type: 'earning',
        amount: e.amount,
        description: e.description || 'Earnings',
        date: e.createdAt
      })),
      ...withdrawals.map((w: any) => ({
        type: 'withdrawal',
        amount: -w.amount,
        description: `Withdrawal to ${w.destination}`,
        date: w.createdAt
      }))
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ transactions });
  } catch (error) {
    console.error('Wallet transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
