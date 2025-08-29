 import { Router } from 'express';
import * as stakingCtrl from '../controllers/stakingController';
const r = Router();
r.post('/start', stakingCtrl.startStaking);
r.get('/status/:userId', stakingCtrl.status);
export default r;
