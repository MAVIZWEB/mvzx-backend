import express from 'express';

const router = express.Router();

/**
 * API ENDPOINTS MAP:
 * 
 * AUTH:
 * POST /api/auth/signup - User registration
 * POST /api/auth/login - User login
 * 
 * USER:
 * GET /api/user/dashboard - Get user dashboard data
 * GET /api/user/profile - Get user profile
 * 
 * PURCHASE:
 * POST /api/purchase/mvzx - Purchase MVZx tokens
 * GET /api/purchase/history - Get purchase history
 * 
 * MATRIX:
 * GET /api/matrix - Get user matrix data
 * GET /api/matrix/structure/:stage - Get matrix structure for stage
 * 
 * EARNINGS:
 * GET /api/earnings - Get earnings history
 * GET /api/withdrawals - Get withdrawal history
 * POST /api/earnings/withdraw - Request withdrawal
 * 
 * STAKING:
 * GET /api/staking/plans - Get user staking plans
 * POST /api/staking/create - Create staking plan
 * 
 * WALLET:
 * GET /api/wallet/balance - Get wallet balance
 * GET /api/wallet/transactions - Get wallet transactions
 * 
 * ADMIN:
 * GET /api/admin/purchases/pending - Get pending purchases (admin)
 * PUT /api/admin/purchases/:id/approve - Approve purchase (admin)
 * PUT /api/admin/purchases/:id/reject - Reject purchase (admin)
 * GET /api/admin/withdrawals/pending - Get pending withdrawals (admin)
 * PUT /api/admin/withdrawals/:id/approve - Approve withdrawal (admin)
 * PUT /api/admin/withdrawals/:id/reject - Reject withdrawal (admin)
 */

// API documentation endpoint
router.get('/endpoints', (req, res) => {
  res.json({
    message: 'Maviz MLM API Endpoints',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login'
      },
      user: {
        dashboard: 'GET /api/user/dashboard',
        profile: 'GET /api/user/profile'
      },
      purchase: {
        create: 'POST /api/purchase/mvzx',
        history: 'GET /api/purchase/history'
      },
      matrix: {
        get: 'GET /api/matrix',
        structure: 'GET /api/matrix/structure/:stage'
      },
      earnings: {
        get: 'GET /api/earnings',
        withdraw: 'POST /api/earnings/withdraw',
        withdrawals: 'GET /api/withdrawals'
      },
      staking: {
        plans: 'GET /api/staking/plans',
        create: 'POST /api/staking/create'
      },
      wallet: {
        balance: 'GET /api/wallet/balance',
        transactions: 'GET /api/wallet/transactions'
      },
      admin: {
        pendingPurchases: 'GET /api/admin/purchases/pending',
        approvePurchase: 'PUT /api/admin/purchases/:id/approve',
        rejectPurchase: 'PUT /api/admin/purchases/:id/reject',
        pendingWithdrawals: 'GET /api/admin/withdrawals/pending',
        approveWithdrawal: 'PUT /api/admin/withdrawals/:id/approve',
        rejectWithdrawal: 'PUT /api/admin/withdrawals/:id/reject'
      }
    }
  });
});

export default router;
