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

// Stake MVZx tokens
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

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Check sufficient balance
    if (wallet.mvzx < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient MVZx balance' });
    }

    // Calculate end date (150 days from now)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 150);

    // Create stake
    const stake = await prisma.stake.create({
      data: {
        userId,
        amount,
        endDate,
        apy: 100 // 100% APY
      }
    });

    // Deduct staked amount from wallet
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

// Get staking history
router.get('/history', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const stakes = await prisma.stake.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.stake.count({ where: { userId } });

    res.json({
      success: true,
      data: {
        stakes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Staking history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Calculate staking rewards
router.get('/calculate-rewards/:stakeId', authenticateToken, async (req: any, res: any) => {
  try {
    const { stakeId } = req.params;
    const userId = req.user.userId;

    const stake = await prisma.stake.findFirst({
      where: { id: parseInt(stakeId), userId }
    });

    if (!stake) {
      return res.status(404).json({ success: false, message: 'Stake not found' });
    }

    // Calculate rewards based on time elapsed
    const now = new Date();
    const timeElapsed = now.getTime() - stake.startDate.getTime();
    const totalStakingTime = stake.endDate.getTime() - stake.startDate.getTime();
    const percentageElapsed = timeElapsed / totalStakingTime;
    
    const totalRewards = Number(stake.amount) * (Number(stake.apy) / 100) * (150 / 365); // 100% APY for 150 days
    const currentRewards = totalRewards * percentageElapsed;

    res.json({
      success: true,
      data: {
        stake,
        currentRewards: currentRewards.toFixed(8),
        totalRewards: totalRewards.toFixed(8),
        percentageElapsed: (percentageElapsed * 100).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Rewards calculation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
