import { Router } from "express";
import { nanoid } from "nanoid";

const router = Router();

const offers: any[] = [];

router.get("/offers", (req, res) => {
  return res.json(offers);
});

router.post("/create-offer", (req, res) => {
  try {
    const { type, price, min, max } = req.body;
    if (!type || !price || !min || !max)
      return res.status(400).json({ error: "All fields are required." });

    const offer = {
      id: nanoid(),
      type,
      price,
      min,
      max,
    };

    offers.push(offer);
    return res.json({ message: "Offer created.", offer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
