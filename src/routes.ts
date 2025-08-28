 import { Router } from "express";
import * as authController from "./controllers/authController";
import * as walletController from "./controllers/walletController";
import * as purchaseController from "./controllers/purchaseController";
import * as matrixController from "./controllers/matrixController";

const router = Router();

// ===== AUTH ROUTES =====
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// ===== WALLET ROUTES =====
router.get("/wallet/:userId", walletController.getWallet);
router.post("/wallet/transfer", walletController.transfer);
router.post("/wallet/withdraw", walletController.withdraw);

// ===== PURCHASE ROUTES =====
router.post("/purchase", purchaseController.createPurchase);
router.get("/purchases/:userId", purchaseController.getPurchases);

// ===== MATRIX ROUTES =====
router.post("/matrix/position", matrixController.assignPosition);
router.get("/matrix/user/:userId", matrixController.getUserMatrix);

// ===== REWARDS ROUTES =====
router.get("/rewards/:userId", matrixController.getUserRewards);

export default router;
