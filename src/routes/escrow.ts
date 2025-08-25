 import { Router } from "express";

const router = Router();
const offers: any[] = [];

// List offers
router.get("/list", (_req, res) => {
  res.json(offers);
});

// Create offer
router.post("/create", (req, res) => {
  try {
    const { type, price, min, max, email } = req.body;
    if (!type || !price || !min || !max || !email)
      return res.status(400).json({ error: "All fields required" });

    const offer = { id: offers.length + 1, type, price, min, max, email };
    offers.push(offer);
    res.json({ message: "Offer created!", offer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
