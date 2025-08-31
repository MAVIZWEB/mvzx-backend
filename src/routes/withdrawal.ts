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

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (currency === 'USDT' && wallet.usdt < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient USDT balance' });
    }

    if (type === 'bank' && (!bankName || !accountNumber || !accountName)) {
      return res.status(400).json({ success: false, message: 'Bank details required' });
    }

    if (type === 'usdt' && !usdtAddress) {
      return res.status(400).json({ success: false, message: 'USDT address required' });
    }

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

export default router;
