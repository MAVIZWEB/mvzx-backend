 import { Router } from 'express';
import * as wCtrl from '../controllers/withdrawalController';
const r = Router();
r.post('/ngn', wCtrl.withdrawToNgn);
r.post('/usdt', wCtrl.withdrawToUsdt);
export default r;
