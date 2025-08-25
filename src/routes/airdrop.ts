 import { Router } from "express";

const router = Router();

// Claim free airdrop (demo)
router.post("/claim", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    res.json({ amount: 1, message: "Airdrop claimed!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
