import { Router } from "express";
import { nanoid } from "nanoid";

const router = Router();

// In-memory users store (same as auth.ts)
const users: any[] = [];

// Spin wheel endpoint
router.post("/spin", (req, res) => {
  try {
    const { userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ error: "User not found" });

    if (user.freeSpins <= 0 && user.balance < 1)
      return res.status(400).json({ error: "No spins left. Buy MVZx to continue." });

    const sectors = [1, 3, "Try Again", 5, 7];
    const result = sectors[Math.floor(Math.random() * sectors.length)];

    if (result !== "Try Again") {
      user.balance += result as number;
    }

    if (user.freeSpins > 0) user.freeSpins--;

    return res.json({
      result,
      balance: user.balance,
      freeSpins: user.freeSpins,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
