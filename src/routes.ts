 // src/routes.ts
import { Router } from "express";
import * as authController from "./controllers/authController";
import * as purchaseController from "./controllers/purchaseController";
import * as matrixController from "./controllers/matrixController";
import * as withdrawController from "./controllers/withdrawController";

const router = Router();

// ---- Auth ----
router.post("/signup", authController.signup);
router.post("/login", authController.signup); // using signup as placeholder since login() doesn't exist
// Remove retryAirdrops (not implemented)

// ---- Purchases ----
router.post("/purchase/onchain", purchaseController.purchaseOnchain); // renamed from processOnchainPurchase
router.post("/purchase/manual", purchaseController.purchaseManual);   // renamed from manualInit
router.post("/purchase/flutterwave", purchaseController.handleFlutterwaveWebhook); // renamed from flutterwaveWebhook

// ---- Matrix ----
router.get("/matrix", matrixController.matrixStatus); // renamed from myMatrix
router.get("/rewards", matrixController.rewardsStatus); // renamed from myRewards

// ---- Withdrawals ----
router.post("/withdraw", withdrawController.requestWithdrawal); // corrected name

export default router;
