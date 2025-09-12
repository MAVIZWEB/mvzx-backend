import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';
import purchaseRouter from './routes/purchase';
import adminRouter from './routes/admin';
import withdrawalRouter from './routes/withdrawal';
import cron from 'node-cron';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(bodyParser.json());

app.use('/api/auth', authRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/admin', adminRouter);
app.use('/api/withdrawal', withdrawalRouter);

app.get('/', (_, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => console.log('Server listening on', PORT));

// Cron: unlock staking (simple sweep every hour)
cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const due = await prisma.staking.findMany({ where: { unlockAt: { lte: now }, claimed: false } });
  for (const s of due) {
    await prisma.user.update({ where: { id: s.userId }, data: { balanceMVZx: { increment: s.amount } } });
    await prisma.staking.update({ where: { id: s.id }, data: { claimed: true } });
  }
});
