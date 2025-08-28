 import express from "express";
import * as authController from "./controllers/authController";
import * as walletController from "./controllers/walletController";
import * as withdrawalController from "./controllers/withdrawalController";

const router = express.Router();

// =======================
// Auth Routes
// =======================
router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);

// =======================
// Wallet Routes
// =======================
router.get("/wallet/:userId", walletController.getWallet);
router.post("/wallet/debit", walletController.debitWallet);
router.post("/wallet/credit", walletController.creditWallet);

// =======================
// Withdrawal Routes
// =======================
router.post("/withdraw", withdrawalController.createWithdrawal);
router.get("/withdraw/:userId", withdrawalController.getWithdrawals);

export default router;
