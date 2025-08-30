import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { assignPositionAndDistribute } from '../services/matrixService';
import { processUSDTOurchase, processFlutterwavePurchase, processBankTransfer } from '../services/purchaseService';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
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

// Purchase MVZx Tokens
router.post('/mvzx', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, paymentMethod, paymentDetails, referrerCode } = req.body;
    const userId = req.user.userId;

    // Validate minimum purchase amount
    if (currency === 'NGN' && amount < 200) {
      return res.status(400).json({ error: 'Minimum purchase amount is N200' });
    }

    let purchase;
    
    // Process based on payment method
    switch (paymentMethod) {
      case 'usdt':
        purchase = await processUSDTOurchase(userId, amount, paymentDetails);
        break;
      case 'flutterwave':
        purchase = await processFlutterwavePurchase(userId, amount, paymentDetails);
        break;
      case 'bank_transfer':
        purchase = await processBankTransfer(userId, amount, paymentDetails);
        break;
      default:
        return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check if purchase qualifies for matrix position (N2000 or multiple)
    const qualifiesForMatrix = currency === 'NGN' && amount >= 2000 && amount % 2000 === 0;
    
    if (qualifiesForMatrix) {
      // Calculate matrix base (per unit)
      const matrixBase = currency === 'NGN' ? 
        amount / parseInt(process.env.NGN_PER_USDT || '1500') * parseFloat(process.env.MVZX_USDT_RATE || '0.15') :
        amount * parseFloat(process.env.MVZX_USDT_RATE || '0.15');
      
      // Assign matrix position and distribute rewards
      await assignPositionAndDistribute(userId, matrixBase, purchase.id);
    } else {
      // Apply 2.5% referral rewards for non-matrix purchases
      if (referrerCode) {
        await applyReferralRewards(userId, referrerCode, amount, currency);
      }
    }

    res.json({
      message: 'Purchase processed successfully',
      purchase,
      qualifiesForMatrix
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function applyReferralRewards(userId: number, referrerCode: string, amount: number, currency: string) {
  // Find referrer
  const referrer = await prisma.user.findFirst({
    where: { email: referrerCode },
    include: { wallet: true }
  });

  if (!referrer) return;

  // Calculate rewards (2.5% each for buyer and referrer)
  const rewardPercentage = 0.025;
  let rewardAmount;
  
  if (currency === 'NGN') {
    // Convert NGN to MVZx tokens
    const ngnPerUSDT = parseInt(process.env.NGN_PER_USDT || '1500');
    const mvzxRate = parseFloat(process.env.MVZX_USDT_RATE || '0.15');
    rewardAmount = (amount * rewardPercentage) / ngnPerUSDT / mvzxRate;
  } else {
    // USDT directly to MVZx tokens
    rewardAmount = amount * rewardPercentage / parseFloat(process.env.MVZX_USDT_RATE || '0.15');
  }

  // Update buyer's wallet
  await prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: rewardAmount } }
  });

  // Update referrer's wallet
  await prisma.wallet.update({
    where: { userId: referrer.id },
    data: { balance: { increment: rewardAmount } }
  });

  // Record the referral rewards
  await prisma.referralReward.create({
    data: {
      purchaserId: userId,
      referrerId: referrer.id,
      amount: rewardAmount * 2, // Total reward amount
      purchaserReward: rewardAmount,
      referrerReward: rewardAmount,
      currency,
      originalAmount: amount
    }
  });
}

export default router;
