 import express from "express";

// Controllers
import * as authController from "./controllers/authController";
import * as walletController from "./controllers/walletController";
import * as matrixController from "./controllers/matrixController";
import * as withdrawalController from "./controllers/withdrawalController";

const router = express.Router();

/* ----------------- AUTH ROUTES ----------------- */
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);

/* ----------------- WALLET ROUTES ----------------- */
router.get("/wallet/:userId", walletController.getWallet);
router.post("/wallet/credit", walletController.creditWallet);
router.post("/wallet/debit", walletController.debitWallet);

/* ----------------- MATRIX ROUTES ----------------- */
router.get("/matrix/:userId", matrixController.getMatrix);
router.post("/matrix/join", matrixController.joinMatrix);
router.post("/matrix/progress", matrixController.progressMatrix);

/* --------------- WITHDRAWAL ROUTES --------------- */
router.post("/withdrawal/request", withdrawalController.requestWithdrawal);
router.get("/withdrawal/:userId", withdrawalController.getWithdrawals);

export default router;
