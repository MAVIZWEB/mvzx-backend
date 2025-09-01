 import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Percent definitions (per LEG base) - Using half of purchase amount
const P = {
  MC: 0.15,  // Matrix Completion (15% of half base)
  JB: 0.10,  // Joining Bonus (10% of half base - only stage 1)
  NSP: 0.35, // Next Stage Position (35% of half base)
  CR: 0.20,  // Company Re-entry (20% of half base)
  LP: 0.10,  // Liquidity Provisioning (10% of half base)
  CP: 0.10,  // Company Profit (10% of half base)
};

export async function processPurchase(userId: number, amount: number, referralCode?: string) {
  try {
    const matrixSlots = Math.floor(amount / 2000);
    const remainder = amount % 2000;
    
    let totalTokens = 0;
    
    // Process MLM matrix slots
    for (let i = 0; i < matrixSlots; i++) {
      const tokens = await processMLMPurchase(userId, 2000);
      totalTokens += tokens;
    }
    
    // Process remainder as affiliate purchase if applicable
    if (remainder >= 200) {
      const affiliateTokens = await processAffiliatePurchase(userId, remainder, referralCode);
      totalTokens += affiliateTokens;
    }
    
    return { success: true, matrixSlots, totalTokens };
  } catch (error: any) {
    console.error('Purchase processing error:', error);
    return { success: false, error: error.message };
  }
}

async function processMLMPurchase(userId: number, amount: number): Promise<number> {
  const halfAmount = amount / 2; // 1000 NGN from 2000 NGN
  const tokens = halfAmount / parseFloat(process.env.NGN_PER_USDT!) * parseFloat(process.env.MVZX_USDT_RATE!);
  
  // Create matrix position
  const matrix = await prisma.matrix.create({
    data: {
      userId,
      stage: 1,
      baseAmount: halfAmount,
      position: await findAvailablePosition(1),
      earnings: 0
    }
  });
  
  // Update user wallet with tokens
  await prisma.wallet.update({
    where: { userId },
    data: { mvzx: { increment: tokens } }
  });
  
  // Process initial rewards
  await processMatrixRewards(matrix.id, halfAmount);
  
  return tokens;
}

async function processAffiliatePurchase(userId: number, amount: number, referralCode?: string): Promise<number> {
  const usdtAmount = amount / parseFloat(process.env.NGN_PER_USDT!);
  const tokens = usdtAmount * parseFloat(process.env.MVZX_USDT_RATE!);
  
  // Update user wallet
  await prisma.wallet.update({
    where: { userId },
    data: { mvzx: { increment: tokens } }
  });
  
  // Process referral rewards if referral code provided
  if (referralCode) {
    await processReferralRewards(userId, usdtAmount, referralCode);
  }
  
  return tokens;
}

async function processReferralRewards(userId: number, amount: number, referralCode: string) {
  // Find referrer by referral code
  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    include: { referrer: true } // Get referrer's upline
  });
  
  if (!referrer) return;
  
  const rewardRate = 0.025; // 2.5% for both referrer and buyer
  
  // Reward buyer (2.5%)
  await prisma.wallet.update({
    where: { userId },
    data: { usdt: { increment: amount * rewardRate } }
  });
  
  // Reward referrer (2.5%)
  await prisma.wallet.update({
    where: { userId: referrer.id },
    data: { usdt: { increment: amount * rewardRate } }
  });
  
  // Reward referrer's upline (0.5% if exists)
  if (referrer.referredBy) {
    await prisma.wallet.update({
      where: { userId: referrer.referredBy },
      data: { usdt: { increment: amount * 0.005 } }
    });
  }
  
  // Create referral record
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: userId,
      amount: amount,
      commission: amount * rewardRate * 2, // Total commission
      level: 1,
      type: 'affiliate'
    }
  });
}

async function processMatrixRewards(matrixId: number, halfBaseAmount: number) {
  const rewards = {
    MC: Number(halfBaseAmount) * P.MC,       // 150 NGN
    JB: Number(halfBaseAmount) * P.JB,       // 100 NGN (only stage 1)
    NSP: Number(halfBaseAmount) * P.NSP,     // 350 NGN
    CR: Number(halfBaseAmount) * P.CR,       // 200 NGN
    LP: Number(halfBaseAmount) * P.LP,       // 100 NGN
    CP: Number(halfBaseAmount) * P.CP,       // 100 NGN
  };
  
  // Store rewards for later distribution
  await prisma.matrix.update({
    where: { id: matrixId },
    data: { earnings: rewards.MC / 2 } // Credit half MC initially
  });
  
  return rewards;
}

export async function processLegCompletion(matrixId: number, legType: 'left' | 'right') {
  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId }
  });
  
  if (!matrix) throw new Error('Matrix position not found');
  
  const halfMC = (Number(matrix.baseAmount) * P.MC) / 2; // 75 NGN for stage 1
  
  if (legType === 'left') {
    await prisma.matrix.update({
      where: { id: matrixId },
      data: { 
        leftFilled: true, 
        earnings: { increment: halfMC }
      }
    });
  } else {
    await prisma.matrix.update({
      where: { id: matrixId },
      data: { 
        rightFilled: true, 
        earnings: { increment: halfMC }
      }
    });
  }
  
  // Update user wallet with half MC
  await prisma.wallet.update({
    where: { userId: matrix.userId },
    data: { 
      usdt: { increment: halfMC / parseFloat(process.env.NGN_PER_USDT!) }
    }
  });
  
  // Check if matrix is completed
  const updatedMatrix = await prisma.matrix.findUnique({
    where: { id: matrixId }
  });
  
  if (updatedMatrix?.leftFilled && updatedMatrix?.rightFilled) {
    await completeMatrix(matrixId);
  }
}

async function completeMatrix(matrixId: number) {
  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId }
  });
  
  if (!matrix) return;
  
  const totalMC = Number(matrix.baseAmount) * P.MC; // Full 150 NGN for stage 1
  const alreadyPaid = Number(matrix.earnings);
  const lumpSum = totalMC - alreadyPaid; // 75 NGN balance for stage 1
  
  // Credit lump sum to user
  await prisma.matrix.update({
    where: { id: matrixId },
    data: { 
      isCompleted: true,
      completedAt: new Date(),
      earnings: totalMC
    }
  });
  
  await prisma.wallet.update({
    where: { userId: matrix.userId },
    data: { 
      usdt: { increment: lumpSum / parseFloat(process.env.NGN_PER_USDT!) }
    }
  });
  
  // Auto-place in next stage if not stage 20
  if (matrix.stage < 20) {
    const nextStageBase = await calculateNextStageBase(matrix.stage, Number(matrix.baseAmount));
    await createNextStagePosition(matrix.userId, matrix.stage + 1, nextStageBase);
  }
  
  // Process company re-entry for stage 20
  if (matrix.stage === 20) {
    await processCompanyReEntry(Number(matrix.baseAmount) * P.CR);
  }
}

async function calculateNextStageBase(currentStage: number, currentBase: number): Promise<number> {
  // NSP from 6 legs of current stage
  return 6 * (currentBase * P.NSP);
}

async function createNextStagePosition(userId: number, stage: number, baseAmount: number) {
  const matrix = await prisma.matrix.create({
    data: {
      userId,
      stage,
      baseAmount,
      position: await findAvailablePosition(stage),
      earnings: 0
    }
  });
  
  await processMatrixRewards(matrix.id, baseAmount);
}

async function processCompanyReEntry(amount: number) {
  // Company uses CR to buy new slot in stage 1
  const companyUserId = 1; // Assuming company has user ID 1
  await processMLMPurchase(companyUserId, amount * 2); // Convert back to full amount
}

async function findAvailablePosition(stage: number): Promise<number> {
  // Find the next available position in the matrix stage
  const lastPosition = await prisma.matrix.findFirst({
    where: { stage },
    orderBy: { position: 'desc' }
  });
  
  return (lastPosition?.position || 0) + 1;
}

export async function assignPositionAndDistribute(userId: number, matrixBase: number) {
  // Simplified version for existing code compatibility
  const matrix = await prisma.matrix.create({
    data: {
      userId,
      stage: 1,
      baseAmount: matrixBase,
      position: await findAvailablePosition(1),
      earnings: 0
    }
  });
  
  const rewards = await processMatrixRewards(matrix.id, matrixBase);
  
  return {
    success: true,
    stage: 1,
    rewards,
    legsFilled: 0
  };
}
