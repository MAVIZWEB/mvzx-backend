 import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { initFlutterwave, verifyFlutterwave, bankDeposit, usdtPurchase } from "../controllers/purchaseController";
const r = Router();

r.post("/flw/init", requireAuth, initFlutterwave);
r.post("/flw/verify", requireAuth, verifyFlutterwave);
r.post("/bank", requireAuth, bankDeposit);
r.post("/usdt", requireAuth, usdtPurchase);

export default r;
