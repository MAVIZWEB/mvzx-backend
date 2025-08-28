 import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const router = Router();

// Generate random wallet address
function generateWallet() {
  return "0x" + randomBytes(20).toString("hex");
}

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { pin, email, referrerId } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: "PIN must be 4 digits" });
    }

    const wallet = generateWallet();

    const user = await prisma.user.create({
      data: {
        email,
        pin,
        wallet,
        balance: 0.5, // free 0.5 MVZx on signup
      },
    });

    // Save referral if referrer exists
    if (referrerId) {
      const refExists = await prisma.user.findUnique({ where: { id: referrerId } });
      if (refExists) {
        await prisma.referral.create({
          data: {
            referrerId,
            referredId: user.id,
          },
        });
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Signup failed", details: err });
  }
});

export default router;
