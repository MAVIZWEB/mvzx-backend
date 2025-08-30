 import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, CreateUserInput } from '../models/User';

const router = express.Router();

// Signup with Free 0.5 MVZx Tokens
router.post('/signup', async (req: express.Request, res: express.Response) => {
  try {
    const { email, phone, password, pin, referrerCode } = req.body;

    // Validate input
    if (!email || !phone || !password || !pin) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4 digits' });
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password and PIN
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin + process.env.PIN_SALT!, 10);

    // Find referrer if provided
    let referrerId: number | undefined = undefined;
    if (referrerCode) {
      const referrer = await UserModel.findByEmail(referrerCode);
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create user
    const userData: CreateUserInput = {
      email,
      phone,
      password: hashedPassword,
      pin: hashedPin,
      referrerId
    };

    const user = await UserModel.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
