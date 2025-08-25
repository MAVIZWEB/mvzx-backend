import { Router } from "express";

const router = Router();

// In-memory users store (should be same instance as auth.ts)
const users: any[] = [];

// Mining cooldown tracker
const miningCooldowns: Record<string, number> = {}; // userId -> timestamp

router.post("/mine", (req, res) => {
  try {
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ error: "User not found." });

    const now = Date.now();
    const lastMine = miningCooldowns[userId] || 0;
    const elapsed = now - lastMine;
    const oneDay = 24 * 60 * 60 * 1000;

    if (elapsed < oneDay) {
      const remaining = oneDay - elapsed;
      return res.status(400).json({
        error: "Mining cooldown active",
        remainingMs: remaining,
      });
    }

    const reward = Math.random() * 0.5; // Max 0.5 MVZx per day
    user.balance += reward;
    miningCooldowns[userId] = now;

    return res.json({
      message: "Mining successful",
      reward,
      balance: user.balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
