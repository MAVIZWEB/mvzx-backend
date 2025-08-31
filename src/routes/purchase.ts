 import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import Flutterwave from 'flutterwave-node-v3';
import BlockchainService from '../services/blockchainService';
import { assignPositionAndDistribute } from '../services/matrixService';

const router = express.Router();
const prisma = new PrismaClient();
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY!, process.env.FLW_SECRET_KEY!);

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

// Purchase with USDT (BEP-20)
router.post('/usdt', authenticateToken, [
  body('amount').isFloat({ min: 200 }),
  body('txHash').isLength({ min: 64, max: 66 })
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount, txHash } = req.body;
    const userId = req.user.userId;

    // Get user wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user || !user.wallet) {
      return res.status(404).json({ success: false, message: 'User or wallet not found' });
    }

    // Verify transaction
    const isValidTx = await BlockchainService.verifyTransaction(
      txHash,
      user.walletAddress,
      process.env.COMPANY_WALLET!,
      amount
    );

    if (!isValidTx) {
      return res.status(400).json({ success: false, message: 'Invalid transaction' });
    }

    // Calculate tokens
    const tokens = amount * parseFloat(process.env.MVZX_USDT_RATE!);

    // Check if amount qualifies for matrix position
    const slotCost = parseFloat(process.env.SLOT_COST_NGN!);
    const ngnAmount = amount * parseFloat(process.env.NGN_PER_USDT!);
    const matrixSlots = Math.floor(ngnAmount / slotCost);
    const remainder = ngnAmount % slotCost;

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        amount,
        currency: 'USDT',
        status: 'approved',
        method: 'usdt',
        txHash,
        tokens,
        approvedAt: new Date(),
        approvedBy: 1 // System admin
      }
    });

    // Update user wallet
    await prisma.wallet.update({
      where: { userId },
      data: { mvzx: { increment: tokens } }
    });

    // Process matrix if applicable
    if (matrixSlots > 0) {
      const matrixBase = slotCost / parseFloat(process.env.NGN_PER_USDT!); // Convert to USDT equivalent
      
      for (let i = 0; i < matrixSlots; i++) {
        await assignPositionAndDistribute(userId, matrixBase);
      }
    }

    // Process referral rewards if applicable
    if (user.referredBy) {
      const referralReward = amount * 0.025; // 2.5%
      
      // Reward referrer
      await prisma.wallet.update({
        where: { userId: parseInt(user.referredBy) },
        data: { usdt: { increment: referralReward } }
      });

      // Reward buyer (self)
      await prisma.wallet.update({
        where: { userId },
        data: { usdt: { increment: referralReward } }
      });

      // Create referral record
      await prisma.referral.create({
        data: {
          referrerId: parseInt(user.referredBy),
          refereeId: userId,
          amount,
          commission: referralReward * 2, // Total commission (both referrer and buyer)
          level: 1
        }
      });
    }

    res.json({
      success: true,
      message: 'Purchase successful',
      data: {
        purchase,
        tokens,
        matrixSlots,
        remainder
      }
    });
  } catch (error) {
    console.error('USDT purchase error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Purchase with Flutterwave (NGN)
router.post('/flutterwave', authenticateToken, [
  body('amount').isFloat({ min: 200 })
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount } = req.body;
    const userId = req.user.userId;

    // Generate transaction reference
    const txRef = `MVZX-${Date.now()}-${userId}`;

    // Initialize payment
    const paymentData = {
      tx_ref: txRef,
      amount: amount,
      currency: 'NGN',
      redirect_url: `${process.env.FRONTEND_URL}/purchase/verify`,
      customer: {
        email: req.user.email,
      },
      customizations: {
        title: 'MVZx Token Purchase',
        description: 'Purchase of MVZx tokens'
      }
    };

    const response = await flw.Payment.initiate(paymentData);

    if (response.status === 'success') {
      // Create pending purchase record
      await prisma.purchase.create({
        data: {
          userId,
          amount,
          currency: 'NGN',
          status: 'pending',
          method: 'flutterwave',
          flutterwaveRef: txRef
        }
      });

      res.json({
        success: true,
        message: 'Payment initialized',
        data: {
          paymentLink: response.data.link,
          txRef
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Failed to initialize payment' });
    }
  } catch (error) {
    console.error('Flutterwave payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Verify Flutterwave payment
router.get('/verify-flutterwave', async (req: express.Request, res: express.Response) => {
  try {
    const { transaction_id, tx_ref, status } = req.query;

    if (status !== 'successful') {
      return res.redirect(`${process.env.FRONTEND_URL}/purchase/failed`);
    }

    // Verify transaction
    const response = await flw.Transaction.verify({ id: transaction_id as string });
    
    if (response.data.status === 'successful' && response.data.amount >= 200) {
      // Find purchase record
      const purchase = await prisma.purchase.findFirst({
        where: { flutterwaveRef: tx_ref as string },
        include: { user: true }
      });

      if (!purchase) {
        return res.redirect(`${process.env.FRONTEND_URL}/purchase/failed`);
      }

      // Calculate tokens
      const usdtAmount = response.data.amount / parseFloat(process.env.NGN_PER_USDT!);
      const tokens = usdtAmount * parseFloat(process.env.MVZX_USDT_RATE!);

      // Update purchase record
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'approved',
          tokens,
          approvedAt: new Date(),
          approvedBy: 1 // System admin
        }
      });

      // Update user wallet
      await prisma.wallet.update({
        where: { userId: purchase.userId },
        data: { mvzx: { increment: tokens } }
      });

      // Check if amount qualifies for matrix position
      const slotCost = parseFloat(process.env.SLOT_COST_NGN!);
      const matrixSlots = Math.floor(response.data.amount / slotCost);
      const remainder = response.data.amount % slotCost;

      // Process matrix if applicable
      if (matrixSlots > 0) {
        const matrixBase = slotCost / parseFloat(process.env.NGN_PER_USDT!); // Convert to USDT equivalent
        
        for (let i = 0; i < matrixSlots; i++) {
          await assignPositionAndDistribute(purchase.userId, matrixBase);
        }
      }

      // Process referral rewards if applicable
      if (purchase.user.referredBy) {
        const referralReward = usdtAmount * 0.025; // 2.5% in USDT equivalent
        
        // Reward referrer
        await prisma.wallet.update({
          where: { userId: parseInt(purchase.user.referredBy) },
          data: { usdt: { increment: referralReward } }
        });

        // Reward buyer (self)
        await prisma.wallet.update({
          where: { userId: purchase.userId },
          data: { usdt: { increment: referralReward } }
        });

        // Create referral record
        await prisma.referral.create({
          data: {
            referrerId: parseInt(purchase.user.referredBy),
            refereeId: purchase.userId,
            amount: usdtAmount,
            commission: referralReward * 2, // Total commission (both referrer and buyer)
            level: 1
          }
        });
      }

      return res.redirect(`${process.env.FRONTEND_URL}/purchase/success`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/purchase/failed`);
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/purchase/failed`);
  }
});

// Bank transfer (manual approval)
router.post('/bank', authenticateToken, [
  body('amount').isFloat({ min: 200 }),
  body('bankRef').trim().isLength({ min: 1 })
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount, bankRef } = req.body;
    const userId = req.user.userId;

    // Calculate tokens
    const usdtAmount = amount / parseFloat(process.env.NGN_PER_USDT!);
    const tokens = usdtAmount * parseFloat(process.env.MVZX_USDT_RATE!);

    // Create pending purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        amount,
        currency: 'NGN',
        status: 'pending',
        method: 'bank',
        bankRef,
        tokens
      }
    });

    res.json({
      success: true,
      message: 'Purchase pending admin approval',
      data: { purchase }
    });
  } catch (error) {
    console.error('Bank transfer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
