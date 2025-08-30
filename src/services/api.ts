import axios from 'axios';

// Use environment variable or default to local development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration and other common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      console.error('Access forbidden:', error.response.data);
    } else if (error.response?.status >= 500) {
      // Server error
      console.error('Server error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// API methods for easier consumption
export const authAPI = {
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  signup: (userData: any) => 
    api.post('/auth/signup', userData),
};

export const userAPI = {
  getDashboard: () => api.get('/user/dashboard'),
  getProfile: () => api.get('/user/profile'),
};

export const purchaseAPI = {
  create: (purchaseData: any) => api.post('/purchase/mvzx', purchaseData),
  getHistory: () => api.get('/purchase/history'),
};

export const matrixAPI = {
  getMatrix: () => api.get('/matrix'),
  getStructure: (stage: number) => api.get(`/matrix/structure/${stage}`),
};

export const earningsAPI = {
  getEarnings: () => api.get('/earnings'),
  withdraw: (withdrawalData: any) => api.post('/earnings/withdraw', withdrawalData),
};

export const withdrawalsAPI = {
  getWithdrawals: () => api.get('/withdrawals'),
};

export const stakingAPI = {
  getPlans: () => api.get('/staking/plans'),
  createPlan: (stakingData: any) => api.post('/staking/create', stakingData),
};

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: () => api.get('/wallet/transactions'),
};

export default api;
