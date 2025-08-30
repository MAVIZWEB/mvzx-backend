import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token and admin role
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Check if user is admin (you would have an admin field in your user model)
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    (req as any).user = user;
    next();
  });
};

// Get all pending bank transfers
router.get('/bank-transfers/pending', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const pendingTransfers = await prisma.purchase.findMany({
      where: { 
        paymentMethod: 'bank_transfer',
        status: 'pending'
      },
      include: {
        user: {
          select: { email: true, phone: true }
        }
      }
    });

    res.json({ transfers: pendingTransfers });
  } catch (error) {
    console.error('Pending transfers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve bank transfer
router.post('/bank-transfers/:id/approve', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.update({
      where: { id: parseInt(id) },
      data: { status: 'completed' },
      include: { user: true }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Calculate MVZx tokens to transfer
    const ngnPerUSDT = parseInt(process.env.NGN_PER_USDT || '1500');
    const mvzxRate = parseFloat(process.env.MVZX_USDT_RATE || '0.15');
    const tokenAmount = purchase.amount / ngnPerUSDT / mvzxRate;

    // Update wallet balance
    await prisma.wallet.update({
      where: { userId: purchase.userId },
      data: { balance: { increment: tokenAmount } }
    });

    res.json({ 
      message: 'Bank transfer approved successfully',
      purchase,
      tokensAdded: tokenAmount
    });
  } catch (error) {
    console.error('Approve transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject bank transfer
router.post('/bank-transfers/:id/reject', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const purchase = await prisma.purchase.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'rejected',
        rejectionReason: reason
      }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json({ 
      message: 'Bank transfer rejected successfully',
      purchase
    });
  } catch (error) {
    console.error('Reject transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all pending withdrawals
router.get('/withdrawals/pending', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: { email: true, phone: true }
        }
      }
    });

    res.json({ withdrawals: pendingWithdrawals });
  } catch (error) {
    console.error('Pending withdrawals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process withdrawal
router.post('/withdrawals/:id/process', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { status, transactionHash } = req.body;

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id: parseInt(id) },
      data: { 
        status,
        transactionHash: status === 'completed' ? transactionHash : null
      },
      include: { user: true }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (status === 'rejected') {
      // Return funds to user's wallet
      await prisma.wallet.update({
        where: { userId: withdrawal.userId },
        data: { 
          balance: { increment: withdrawal.amount },
          lockedBalance: { decrement: withdrawal.amount }
        }
      });
    }

    res.json({ 
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
