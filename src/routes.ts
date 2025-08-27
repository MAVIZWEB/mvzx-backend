import { Router } from 'express';
import * as auth from './controllers/authController';
import * as purchase from './controllers/purchaseController';
import * as matrix from './controllers/matrixController';
import * as withdraw from './controllers/withdrawController';
import { authMiddleware } from './middleware/auth';

const r = Router();
r.post('/auth/signup', auth.signup);
r.post('/auth/login', auth.login);

r.post('/purchase/usdt', authMiddleware, purchase.processOnchainPurchase);
r.post('/purchase/manual', authMiddleware, purchase.manualInit);
r.post('/webhook/flutterwave', purchase.flutterwaveWebhook);

r.get('/matrix/me', authMiddleware, matrix.myMatrix);
r.get('/rewards/me', authMiddleware, matrix.myRewards);

r.post('/withdraw', authMiddleware, withdraw.requestWithdraw);

// admin retry airdrops (protected with JWT; build separate admin-token in env if needed)
r.post('/admin/retry-airdrops', auth.retryAirdrops);

export default r;
