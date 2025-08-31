import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get wallet balance
router.get('/balance', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    res.json({
      success: true,
      data: {
        mvzx: wallet.mvzx,
        usdt: wallet.usdt,
        user: {
          id: wallet.user.id,
          email: wallet.user.email,
          fullName: wallet.user.fullName
        }
      }
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get wallet transactions
router.get('/transactions', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [purchases, withdrawals] = await Promise.all([
      prisma.purchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    const transactions = [
      ...purchases.map(p => ({ ...p, type: 'purchase' })),
      ...withdrawals.map(w => ({ ...w, type: 'withdrawal' }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total: transactions.length
        }
      }
    });
  } catch (error) {
    console.error('Wallet transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
