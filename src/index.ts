 import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import all route files
import apiRoutes from './routes/index';          // API documentation
import authRoutes from './routes/auth';          // Authentication
import userRoutes from './routes/user';          // User management
import walletRoutes from './routes/wallet';      // Wallet operations
import purchaseRoutes from './routes/purchase';  // Token purchases
import matrixRoutes from './routes/matrix';      // Matrix system
import earningsRoutes from './routes/earnings';  // Earnings management
import stakingRoutes from './routes/staking';    // Staking system
import withdrawalsRoutes from './routes/withdrawals'; // Withdrawal history
import adminRoutes from './routes/admin';        // Admin functions

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

// Register all routes with proper prefixes
app.use('/api', apiRoutes);          // API documentation
app.use('/api/auth', authRoutes);    // Authentication endpoints
app.use('/api/user', userRoutes);    // User management endpoints
app.use('/api/wallet', walletRoutes); // Wallet endpoints
app.use('/api/purchase', purchaseRoutes); // Purchase endpoints
app.use('/api/matrix', matrixRoutes); // Matrix endpoints
app.use('/api/earnings', earningsRoutes); // Earnings endpoints
app.use('/api/staking', stakingRoutes); // Staking endpoints
app.use('/api/withdrawals', withdrawalsRoutes); // Withdrawals endpoints
app.use('/api/admin', adminRoutes);  // Admin endpoints

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Maviz MLM API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api/endpoints`);
});

export default app;
