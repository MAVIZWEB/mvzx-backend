import { ethers } from 'ethers';

export const validateEnvironment = () => {
  const requiredEnvVars = [
    'BNB_RPC_URL',
    'MVZX_TOKEN_CONTRACT',
    'USDT_CONTRACT',
    'ADMIN_PRIVATE_KEY',
    'COMPANY_WALLET',
    'JWT_SECRET',
    'DATABASE_URL',
    'FLW_PUBLIC_KEY',
    'FLW_SECRET_KEY',
    'PIN_SALT'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate blockchain addresses
  try {
    if (!ethers.utils.isAddress(process.env.MVZX_TOKEN_CONTRACT!)) {
      throw new Error('Invalid MVZX_TOKEN_CONTRACT address');
    }
    
    if (!ethers.utils.isAddress(process.env.USDT_CONTRACT!)) {
      throw new Error('Invalid USDT_CONTRACT address');
    }
    
    if (!ethers.utils.isAddress(process.env.COMPANY_WALLET!)) {
      throw new Error('Invalid COMPANY_WALLET address');
    }

    // Validate private key
    new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!);
    
  } catch (error: any) {
    throw new Error(`Invalid blockchain configuration: ${error.message}`);
  }

  // Validate numeric values
  const numericVars = ['SLOT_COST_NGN', 'MVZX_USDT_RATE', 'NGN_PER_USDT'];
  for (const varName of numericVars) {
    const value = parseFloat(process.env[varName]!);
    if (isNaN(value) || value <= 0) {
      throw new Error(`Invalid value for ${varName}: must be a positive number`);
    }
  }

  console.log('Environment validation passed');
  return true;
};
