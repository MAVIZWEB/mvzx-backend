 import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { ethers } from 'ethers';

const router = express.Router();
const prisma = new PrismaClient();

// Generate referral code
function generateReferralCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Sign up
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone('any'),
  body('fullName').trim().isLength({ min: 2 }),
  body('pin').isLength({ min: 4, max: 4 }).isNumeric(),
  body('referralCode').optional().trim()
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, phone, fullName, pin, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash PIN with salt
    const salt = process.env.PIN_SALT!;
    const hashedPin = await bcrypt.hash(pin + salt, 10);

    // Generate referral code
    const userReferralCode = generateReferralCode();

    // Generate wallet
    const wallet = ethers.Wallet.createRandom();

    // Check if referral code is valid
    let referredByUserId = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ 
        where: { referralCode },
        select: { id: true }
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        fullName,
        pin: hashedPin,
        walletAddress: wallet.address,
        referralCode: userReferralCode,
        referredBy: referredByUserId,
        wallet: {
          create: {
            mvzx: 0.5, // Free 0.5 MVZx tokens
          }
        }
      },
      include: {
        wallet: true
      }
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          referralCode: user.referralCode,
          walletAddress: wallet.address
        },
        token,
        wallet: {
          address: wallet.address,
          privateKey: wallet.privateKey, // Only returned once during signup
          mvzx: user.wallet?.mvzx || 0
        }
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('pin').isLength({ min: 4, max: 4 }).isNumeric()
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, pin } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify PIN
    const salt = process.env.PIN_SALT!;
    const isValidPin = await bcrypt.compare(pin + salt, user.pin);
    if (!isValidPin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          referralCode: user.referralCode
        },
        token,
        wallet: user.wallet
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
