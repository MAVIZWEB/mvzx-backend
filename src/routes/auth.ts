import { Router } from "express";

const router = Router();

// User login/register stub
router.post("/register", async (req, res) => {
  res.json({ message: "Register user (to be implemented)" });
});

router.post("/login", async (req, res) => {
  res.json({ message: "Login user (to be implemented)" });
});

export default router;
