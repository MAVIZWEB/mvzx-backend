 import { Router } from 'express';
import * as matrixCtrl from '../controllers/matrixController';
const r = Router();
r.get('/me/:userId', matrixCtrl.getUserMatrix);
export default r;
