 import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const router = Router();

// Temporary in-memory store (replace with DB if needed)
const users: any[] = [];

// Signup new user
router.post("/signup", async (req, res) => {
  try {
    const { email, pin, confirmPin } = req.body;

    if (!email || !pin || !confirmPin)
      return res.status(400).json({ error: "All fields are required." });

    if (pin !== confirmPin)
      return res.status(400).json({ error: "PINs do not match." });

    if (users.find(u => u.email === email))
      return res.status(400).json({ error: "Email already registered." });

    const hashedPin = await bcrypt.hash(pin, 10);
    const walletAddress = "0x" + nanoid(40);

    const user = {
      id: nanoid(),
      email,
      pin: hashedPin,
      walletAddress,
      balance: 0,
      freeSpins: 3,
      isAdmin: false,
    };

    users.push(user);

    return res.status(201).json({
      message: "Signup successful!",
      walletAddress: user.walletAddress,
      email: user.email,
      freeSpins: user.freeSpins,
      balance: user.balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    return res.json({
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      balance: user.balance,
      freeSpins: user.freeSpins,
      isAdmin: user.isAdmin,
    });
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

    if (users.find(u => u.email === email))
      return res.status(400).json({ error: "Email already registered." });

    const hashedPin = await bcrypt.hash(pin, 10);
    const walletAddress = "0x" + nanoid(40);

    const admin = {
      id: nanoid(),
      email,
      pin: hashedPin,
      walletAddress,
      balance: 0,
      freeSpins: 0,
      isAdmin: true,
    };

    users.push(admin);

    return res.status(201).json({
      message: "Admin created successfully!",
      walletAddress: admin.walletAddress,
      email: admin.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Buy MVZx
router.post("/buy", async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ error: "User not found." });

    user.balance += amount;

    return res.json({ balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
