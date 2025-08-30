 import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import walletRoutes from './routes/wallet';
import purchaseRoutes from './routes/purchase';
import matrixRoutes from './routes/matrix';
import earningsRoutes from './routes/earnings';
import stakingRoutes from './routes/staking';
import withdrawalsRoutes from './routes/withdrawals';
import adminRoutes from './routes/admin';
import apiRoutes from './routes/index';

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT || '100')
});

// Middleware
app.use(limiter);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Maviz MLM API is running' });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
