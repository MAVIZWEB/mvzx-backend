// src/routes/public.ts
import { Router } from "express";
const router = Router();

const memoryBoard: any[] = []; // swap for DB table in prod
router.get("/leaderboard", (_req, res) => res.json({ items: memoryBoard.slice(-10).reverse() }));

export default router;
