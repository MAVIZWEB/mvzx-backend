 import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import BlockchainService from '../services/blockchainService';

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

// Request withdrawal
router.post('/request', authenticateToken, [
  body('amount').isFloat({ min: 0.01 }),
  body('currency').isIn(['NGN', 'USDT']),
  body('type').isIn(['bank', 'usdt']),
  body('bankName').optional().trim(),
  body('accountNumber').optional().trim(),
  body('accountName').optional().trim(),
  body('usdtAddress').optional().isEthereumAddress()
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount, currency, type, bankName, accountNumber, accountName, usdtAddress } = req.body;
    const userId = req.user.userId;

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Check sufficient balance
    if (currency === 'USDT' && wallet.usdt < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient USDT balance' });
    }

    // For NGN withdrawals, check if user has provided bank details
    if (type === 'bank' && (!bankName || !accountNumber || !accountName)) {
      return res.status(400).json({ success: false, message: 'Bank details required' });
    }

    // For USDT withdrawals, check if user has provided USDT address
    if (type === 'usdt' && !usdtAddress) {
      return res.status(400).json({ success: false, message: 'USDT address required' });
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount,
        currency,
        type,
        bankName,
        accountNumber,
        accountName,
        usdtAddress,
        status: 'pending'
      }
    });

    // Lock the funds (deduct from available balance)
    if (currency === 'USDT') {
      await prisma.wallet.update({
        where: { userId },
        data: { usdt: { decrement: amount } }
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted',
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get withdrawal history
router.get('/history', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.withdrawal.count({ where: { userId } });

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Withdrawal history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
