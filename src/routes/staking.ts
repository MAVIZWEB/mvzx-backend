 import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createStakingPlan } from '../services/stakingService';

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

// Get user staking plans
router.get('/plans', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.userId;

    const stakingPlans = await prisma.staking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ plans: stakingPlans });
  } catch (error) {
    console.error('Staking plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create staking plan
router.post('/create', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.userId;
    const { amount, duration } = req.body;

    const stakingPlan = await createStakingPlan(userId, amount, duration || 150);

    res.json({
      message: 'Staking plan created successfully',
      stakingPlan
    });
  } catch (error: any) {
    console.error('Staking create error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
