import { PrismaClient } from '@prisma/client';
import Web3 from 'web3';
import Flutterwave from 'flutterwave-node-v3';

const prisma = new PrismaClient();
const web3 = new Web3(process.env.BNB_RPC_URL);
const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY!,
  process.env.FLW_SECRET_KEY!
);

// MVZx Token Contract ABI (simplified)
const MVZX_ABI = [
  {
    "constant": false,
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
];

export async function processUSDTOurchase(userId: number, amount: number, paymentDetails: any) {
  const { txHash } = paymentDetails;
  
  // Verify transaction on blockchain
  const receipt = await web3.eth.getTransactionReceipt(txHash);
  if (!receipt || !receipt.status) {
    throw new Error('Transaction failed or not found');
  }

  // Check if transaction is to correct contract
  if (receipt.to?.toLowerCase() !== process.env.USDT_CONTRACT?.toLowerCase()) {
    throw new Error('Invalid USDT contract');
  }

  // Create purchase record
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      amount,
      currency: 'USDT',
      paymentMethod: 'usdt',
      status: 'completed',
      txHash
    }
  });

  // Calculate MVZx tokens to transfer
  const mvzxRate = parseFloat(process.env.MVZX_USDT_RATE || '0.15');
  const tokenAmount = amount / mvzxRate;

  // Transfer tokens to user's wallet
  await transferMVZxTokens(userId, tokenAmount);

  return purchase;
}

export async function processFlutterwavePurchase(userId: number, amount: number, paymentDetails: any) {
  const { txRef, flwRef } = paymentDetails;
  
  // Verify transaction with Flutterwave
  const response = await flw.Transaction.verify({ id: flwRef });
  if (response.data.status !== 'successful' || response.data.amount !== amount) {
    throw new Error('Flutterwave transaction verification failed');
  }

  // Create purchase record
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      amount,
      currency: 'NGN',
      paymentMethod: 'flutterwave',
      status: 'completed',
      txRef,
      flwRef
    }
  });

  // Calculate MVZx tokens to transfer
  const ngnPerUSDT = parseInt(process.env.NGN_PER_USDT || '1500');
  const mvzxRate = parseFloat(process.env.MVZX_USDT_RATE || '0.15');
  const tokenAmount = amount / ngnPerUSDT / mvzxRate;

  // Transfer tokens to user's wallet
  await transferMVZxTokens(userId, tokenAmount);

  return purchase;
}

export async function processBankTransfer(userId: number, amount: number, paymentDetails: any) {
  const { proofImage, bankName, accountName, accountNumber } = paymentDetails;
  
  // Create pending purchase record (requires admin approval)
  const purchase = await prisma.purchase.create({
    data: {
      userId,
      amount,
      currency: 'NGN',
      paymentMethod: 'bank_transfer',
      status: 'pending',
      proofImage,
      bankName,
      accountName,
      accountNumber
    }
  });

  return purchase;
}

async function transferMVZxTokens(userId: number, amount: number) {
  // Get user's wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user || !user.wallet) {
    throw new Error('User wallet not found');
  }

  // Update wallet balance
  await prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: amount } }
  });

  // In a real implementation, you would also transfer tokens on-chain
  // This is a simplified version that only updates the database
}
