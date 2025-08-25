import { Router } from "express";

const router = Router();
const users: any[] = [];

// Voting storage
const ballot: { up: number; flat: number; down: number } = { up: 0, flat: 0, down: 0 };
const votes: Record<string, string> = {}; // userId -> choice

router.get("/ballot", (_req, res) => {
  res.json(ballot);
});

router.post("/vote", (req, res) => {
  try {
    const { userId, choice } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ error: "User not found." });

    if (votes[userId]) return res.status(400).json({ error: "User already voted." });

    if (!["UP", "FLAT", "DOWN"].includes(choice)) return res.status(400).json({ error: "Invalid choice." });

    votes[userId] = choice;

    if (choice === "UP") ballot.up += 1;
    if (choice === "FLAT") ballot.flat += 1;
    if (choice === "DOWN") ballot.down += 1;

    res.json({ message: "Vote recorded." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
