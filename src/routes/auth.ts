 import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const router = Router();

// In-memory DB
const users: any[] = [];

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, pin, confirmPin } = req.body;
    if (!email || !pin || !confirmPin)
      return res.status(400).json({ error: "All fields required." });
    if (pin !== confirmPin)
      return res.status(400).json({ error: "PINs do not match." });

    const existing = users.find(u => u.email === email);
    if (existing)
      return res.status(400).json({ error: "Email already registered." });

    const hashedPin = await bcrypt.hash(pin, 10);
    const wallet = "0x" + nanoid(40);

    const user = {
      id: nanoid(),
      email,
      pin: hashedPin,
      wallet,
      balance: 0,
      freeSpins: 3,
      isAdmin: false
    };
    users.push(user);

    res.status(201).json({ message: "Signup successful!", wallet, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin creation
router.post("/create-admin", async (req, res) => {
  try {
    const { email, pin, confirmPin } = req.body;
    if (!email || !pin || !confirmPin)
      return res.status(400).json({ error: "All fields required." });
    if (pin !== confirmPin)
      return res.status(400).json({ error: "PINs do not match." });

    const hashedPin = await bcrypt.hash(pin, 10);
    const wallet = "0x" + nanoid(40);

    const admin = {
      id: nanoid(),
      email,
      pin: hashedPin,
      wallet,
      balance: 0,
      freeSpins: 0,
      isAdmin: true
    };
    users.push(admin);

    res.status(201).json({ message: "Admin created!", wallet, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: "Email & PIN required" });

    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(pin, user.pin);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    res.json({
      id: user.id,
      email: user.email,
      wallet: user.wallet,
      balance: user.balance,
      freeSpins: user.freeSpins,
      isAdmin: user.isAdmin
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Buy MVZx
router.post("/buy", (req, res) => {
  try {
    const { email, amount } = req.body;
    if (!email || !amount) return res.status(400).json({ error: "Email & amount required" });

    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "User not found" });

    user.balance += amount;
    res.json({ balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
