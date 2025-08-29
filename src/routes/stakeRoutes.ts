 import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { stakeCreate, stakeClaim } from "../controllers/stakeController";
const r = Router();

r.post("/create", requireAuth, stakeCreate);
r.post("/claim", requireAuth, stakeClaim);

export default r;
