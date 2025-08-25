 import { Router } from "express";

const router = Router();
const votes: Record<string, number> = { UP: 0, FLAT: 0, DOWN: 0 };

// Cast vote
router.post("/cast", (req, res) => {
  try {
    const { choice } = req.body;
    if (!["UP", "FLAT", "DOWN"].includes(choice)) return res.status(400).json({ error: "Invalid choice" });

    votes[choice] += 1;
    res.json({ message: "Vote recorded!", votes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get ballot
router.get("/ballot", (_req, res) => {
  res.json(votes);
});

export default router;
