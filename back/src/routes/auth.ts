import express from 'express';
import prisma from '../lib/prisma';
import { hashPin } from '../utils/crypto';
import { generatePlatformAddress } from '../services/walletService';

const router = express.Router();

// Signup: create user, assign wallet, credit 0.5 MVZx free
router.post('/signup', async (req, res) => {
  try {
    const { email, phone, pin, referrerId } = req.body;
    if (!pin || pin.length !== 4) return res.status(400).json({ error: '4-digit PIN required' });
    const pinHash = await hashPin(pin);
    const wallet = generatePlatformAddress();

    const user = await prisma.user.create({ data: { email, phone, pinHash, walletAddress: wallet.address, balanceMVZx: 0.5, referrerId } });

    return res.json({ ok:true, user: { id: user.id, walletAddress: user.walletAddress, balanceMVZx: user.balanceMVZx } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

export default router;
