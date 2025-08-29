 import { Router } from 'express';
import * as purchaseCtrl from '../controllers/purchaseController';
const r = Router();
r.post('/flutterwave-webhook', purchaseCtrl.flutterwaveWebhook);
r.post('/pay-usdt', purchaseCtrl.payUsdt); // user calls to indicate a USDT tx hash
r.post('/manual-deposit', purchaseCtrl.manualDeposit);
export default r;
