 import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { requestWithdrawal } from "../controllers/withdrawalController";
const r = Router();

r.post("/request", requireAuth, requestWithdrawal);

export default r;
