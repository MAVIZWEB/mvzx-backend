 // backend/src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const AIRDROP = 0.5;

router.post("/signup", async (req, res) => {
  try {
    const { email, pin, ref } = req.body;
    if (!pin || typeof pin !== "string" || pin.length !== 4) return res.status(400).json({ error: "PIN must be 4 digits" });

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: "Email already used" });
    }

    const pinHash = await bcrypt.hash(pin, 10);

    let referredById: number | null = null;
    if (ref) {
      const refUser = await prisma.user.findUnique({ where: { referralCode: ref } });
      if (refUser) referredById = refUser.id;
    }

    // Create wallet placeholder (real wallet created offchain or via ethers later)
    const wallet = "0x" + Math.random().toString(16).slice(2, 42);

    const user = await prisma.user.create({
      data: {
        email: email || null,
        pinHash,
        wallet,
        referredById: referredById || undefined,
        mvzxBalance: AIRDROP,
      }
    });

    // create initial matrix record for user
    await prisma.matrix.create({ data: { userId: user.id, stage: 1 } });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user, airdrop: AIRDROP });
  } catch (e: any) {
    console.error("signup error", e);
    res.status(500).json({ error: e.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: "email and pin required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) return res.status(401).json({ error: "Invalid PIN" });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user });
  } catch (e) {
    console.error("login error", e);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
