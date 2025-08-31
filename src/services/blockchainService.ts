import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize provider and contracts
const provider = new ethers.providers.JsonRpcProvider(process.env.BNB_RPC_URL);
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);

// Token contracts
const mvzxTokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

const usdtTokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

const mvzxContract = new ethers.Contract(process.env.MVZX_TOKEN_CONTRACT!, mvzxTokenAbi, adminWallet);
const usdtContract = new ethers.Contract(process.env.USDT_CONTRACT!, usdtTokenAbi, adminWallet);

export class BlockchainService {
  // Generate a new wallet for user
  static generateWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase
    };
  }

  // Transfer MVZx tokens
  static async transferMVZx(to: string, amount: number) {
    try {
      const decimals = await mvzxContract.decimals();
      const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);
      
      const tx = await mvzxContract.transfer(to, amountInWei);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Error transferring MVZx:', error);
      return { success: false, error };
    }
  }

  // Transfer USDT
  static async transferUSDT(to: string, amount: number) {
    try {
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);
      
      const tx = await usdtContract.transfer(to, amountInWei);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Error transferring USDT:', error);
      return { success: false, error };
    }
  }

  // Check token balance
  static async getBalance(address: string, token: 'MVZX' | 'USDT') {
    try {
      const contract = token === 'MVZX' ? mvzxContract : usdtContract;
      const decimals = await contract.decimals();
      const balance = await contract.balanceOf(address);
      
      return parseFloat(ethers.utils.formatUnits(balance, decimals));
    } catch (error) {
      console.error(`Error getting ${token} balance:`, error);
      return 0;
    }
  }

  // Verify transaction
  static async verifyTransaction(txHash: string, expectedFrom: string, expectedTo: string, expectedAmount: number) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) return false;
      
      const tx = await provider.getTransaction(txHash);
      if (!tx) return false;
      
      // Check if transaction matches expected parameters
      const isFromMatch = tx.from.toLowerCase() === expectedFrom.toLowerCase();
      const isToMatch = tx.to?.toLowerCase() === expectedTo.toLowerCase();
      
      const contract = tx.to?.toLowerCase() === process.env.USDT_CONTRACT!.toLowerCase() ? usdtContract : mvzxContract;
      const decimals = await contract.decimals();
      const amountInWei = ethers.utils.parseUnits(expectedAmount.toString(), decimals);
      
      const isAmountMatch = tx.value ? tx.value.eq(amountInWei) : false;
      
      return isFromMatch && isToMatch && isAmountMatch;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }
}

export default BlockchainService;
