 import { Router } from 'express';
import * as authCtrl from '../controllers/authController';
const r = Router();
r.post('/signup', authCtrl.signup);
r.post('/login', authCtrl.login);
export default r;
