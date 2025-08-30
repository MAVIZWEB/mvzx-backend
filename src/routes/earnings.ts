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

// Get user earnings
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).user.userId;

    const earnings = await prisma.earning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ earnings });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Withdraw earnings
router.post('/withdraw', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, method, destination } = req.body;

    // Validate withdrawal amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    // Get user wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user || !user.wallet) {
      return res.status(404).json({ error: 'User wallet not found' });
    }

    // Check sufficient balance
    if (user.wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount,
        method,
        destination,
        status: 'pending'
      }
    });

    // Lock the withdrawal amount (deduct from available balance)
    await prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        lockedBalance: { increment: amount }
      }
    });

    res.json({
      message: 'Withdrawal request submitted successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
