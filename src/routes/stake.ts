 import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();

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

router.post('/stake', authenticateToken, [
  body('amount').isFloat({ min: 1 })
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount } = req.body;
    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.mvzx < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient MVZx balance' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 150);

    const stake = await prisma.stake.create({
      data: {
        userId,
        amount,
        endDate,
        apy: 100
      }
    });

    await prisma.wallet.update({
      where: { userId },
      data: { mvzx: { decrement: amount } }
    });

    res.json({
      success: true,
      message: 'Tokens staked successfully',
      data: { stake }
    });
  } catch (error) {
    console.error('Staking error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
