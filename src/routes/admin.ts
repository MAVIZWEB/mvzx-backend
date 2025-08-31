 import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify admin JWT token
const authenticateAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isAdmin: true }
    });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  });
};

// Get all pending purchases (for admin approval)
router.get('/purchases/pending', authenticateAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const purchases = await prisma.purchase.findMany({
      where: { status: 'pending' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.purchase.count({ where: { status: 'pending' } });

    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin purchases error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Approve purchase
router.post('/purchases/approve/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    if (purchase.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Purchase already processed' });
    }

    // Update purchase status
    await prisma.purchase.update({
      where: { id: parseInt(id) },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user.userId
      }
    });

    // Update user wallet
    await prisma.wallet.update({
      where: { userId: purchase.userId },
      data: { mvzx: { increment: purchase.tokens } }
    });

    // Check if amount qualifies for matrix position
    const slotCost = parseFloat(process.env.SLOT_COST_NGN!);
    const ngnAmount = Number(purchase.amount);
    const matrixSlots = Math.floor(ngnAmount / slotCost);

    // Process matrix if applicable
    if (matrixSlots > 0 && purchase.currency === 'NGN') {
      const matrixBase = slotCost / parseFloat(process.env.NGN_PER_USDT!); // Convert to USDT equivalent
      
      for (let i = 0; i < matrixSlots; i++) {
        // This would need your matrix service implementation
        // await assignPositionAndDistribute(purchase.userId, matrixBase);
      }
    }

    res.json({
      success: true,
      message: 'Purchase approved successfully'
    });
  } catch (error) {
    console.error('Approve purchase error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all pending withdrawals
router.get('/withdrawals/pending', authenticateAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'pending' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.withdrawal.count({ where: { status: 'pending' } });

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
    console.error('Admin withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Process withdrawal
router.post('/withdrawals/process/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Withdrawal already processed' });
    }

    // Process withdrawal based on type
    if (withdrawal.type === 'usdt' && withdrawal.usdtAddress) {
      // Process USDT withdrawal
      // This would use your blockchain service
      // const result = await BlockchainService.transferUSDT(withdrawal.usdtAddress, Number(withdrawal.amount));
      
      // if (result.success) {
        await prisma.withdrawal.update({
          where: { id: parseInt(id) },
          data: {
            status: 'completed',
            completedAt: new Date(),
            txHash: 'tx_hash_here' // result.txHash
          }
        });
      // } else {
      //   // Handle failure
      // }
    } else if (withdrawal.type === 'bank') {
      // Process bank withdrawal (manual)
      // This would typically involve initiating a bank transfer through your payment provider
      
      // For now, mark as completed
      await prisma.withdrawal.update({
        where: { id: parseInt(id) },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal processed successfully'
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
