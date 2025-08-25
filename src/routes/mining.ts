 import { Router } from "express";

const router = Router();
const miningState: Record<string, { lastClaim: number }> = {};

// Claim mining reward (0.5 MVZx max/day)
router.post("/claim", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const now = Date.now();
    const userMining = miningState[email] || { lastClaim: 0 };
    const elapsed = now - userMining.lastClaim;

    if (elapsed < 24 * 60 * 60 * 1000)
      return res.status(400).json({ error: "Mining cooldown 24h not reached" });

    userMining.lastClaim = now;
    miningState[email] = userMining;

    res.json({ amount: 0.5, message: "Mining reward claimed!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
