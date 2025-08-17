import express from "express";
import { z } from "zod";
import { runSimulation } from "../simulation";

const router = express.Router();

const simulationSchema = z.object({
  userId: z.string(),
  stage: z.number().int().positive(),
});

router.post("/", (req, res) => {
  try {
    const parsed = simulationSchema.parse(req.body);
    const result = runSimulation(parsed);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
