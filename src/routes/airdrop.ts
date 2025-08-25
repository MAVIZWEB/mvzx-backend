import { Router } from "express";

const router = Router();
const users: any[] = [];

// Simple airdrop once per user tracker
const claimed: Record<string, boolean> = {};

router.post("/claim", (req, res) => {
  try {
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ error: "User not found" });

    if (claimed[userId]) return res.status(400).json({ error: "Already claimed" });

    const reward = 1; // 1 MVZx per airdrop
    user.balance += reward;
    claimed[userId] = true;

    return res.json({ amount: reward, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
