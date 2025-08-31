 // src/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { runMigrations } from '../migrate'; // Import migration function

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import walletRoutes from './routes/wallet';
import purchaseRoutes from './routes/purchase';
import matrixRoutes from './routes/matrix';
import earningRoutes from './routes/earning';
import withdrawalRoutes from './routes/withdrawal';
import stakeRoutes from './routes/stake';
import adminRoutes from './routes/admin';

config();

async function startServer() {
  // Run database migrations before starting the server
  console.log('Checking database migrations...');
  try {
    await runMigrations();
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }

  const app = express();
  const prisma = new PrismaClient();

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT || '100'),
    message: 'Too many requests from this IP'
  });

  // Middleware
  app.use(limiter);
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/purchase', purchaseRoutes);
  app.use('/api/matrix', matrixRoutes);
  app.use('/api/earnings', earningRoutes);
  app.use('/api/withdrawals', withdrawalRoutes);
  app.use('/api/stakes', stakeRoutes);
  app.use('/api/admin', adminRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong!',
      error: process.env.LIVE === 'true' ? 'Internal server error' : err.message
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  const PORT = process.env.PORT || 10000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default startServer;
