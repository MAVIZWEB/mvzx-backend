 import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/authRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import matrixRoutes from './routes/matrixRoutes';
import stakingRoutes from './routes/stakingRoutes';
import withdrawalRoutes from './routes/withdrawalRoutes';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

const limiter = rateLimit({ windowMs: 60_000, max: Number(process.env.API_RATE_LIMIT || 100) });
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/withdraw', withdrawalRoutes);

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => { /* handle diagnostics if required */ });
  ws.send(JSON.stringify({ type: 'welcome', message: 'connected to mvzx realtime' }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`mvzx-backend listening on ${PORT}`));
