 import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get user matrix data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const matrices = await prisma.matrix.findMany({
      where: { userId },
      orderBy: { stage: 'asc' }
    });

    // For simplicity, we'll use mock data for legs
    // In a real implementation, you would calculate this based on the matrix structure
    const matrixData = matrices.map(matrix => ({
      stage: matrix.stage,
      position: matrix.position,
      earnings: matrix.earnings,
      leftLeg: Math.floor(Math.random() * 3), // Mock data
      rightLeg: Math.floor(Math.random() * 3), // Mock data
      totalLegs: Math.floor(Math.random() * 5) // Mock data
    }));

    res.json({ matrix: matrixData });
  } catch (error) {
    console.error('Matrix error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get matrix structure for a specific stage
router.get('/structure/:stage', authenticateToken, async (req, res) => {
  try {
    const { stage } = req.params;
    // This would return the matrix structure for the specified stage
    res.json({ 
      stage: parseInt(stage),
      structure: stage === '1' ? '2x2' : '2x5',
      maxPositions: stage === '1' ? 4 : 10 // 2x2=4, 2x5=10
    });
  } catch (error) {
    console.error('Matrix structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
