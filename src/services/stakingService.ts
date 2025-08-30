 import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createStakingPlan(userId: number, amount: number, duration: number) {
  // Validate staking amount
  if (amount <= 0) {
    throw new Error('Invalid staking amount');
  }

  // Get user wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user || !user.wallet) {
    throw new Error('User wallet not found');
  }

  // Check sufficient balance
  if (user.wallet.balance < amount) {
    throw new Error('Insufficient balance for staking');
  }

  // Calculate maturity date (150 days from now)
  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + duration);

  // Create staking record
  const staking = await prisma.staking.create({
    data: {
      userId,
      amount,
      duration,
      maturityDate,
      apy: 100, // 100% APY
      status: 'active'
    }
  });

  // Lock the staked amount
  await prisma.wallet.update({
    where: { userId },
    data: {
      balance: { decrement: amount },
      stakedBalance: { increment: amount }
    }
  });

  return staking;
}

export async function processStakingRewards() {
  // This function should be called by a cron job daily
  const activeStakings = await prisma.staking.findMany({
    where: {
      status: 'active',
      maturityDate: { gt: new Date() }
    }
  });

  for (const staking of activeStakings) {
    // Calculate daily reward (100% APY = ~0.2739% daily)
    const dailyReward = staking.amount * (1 / 365);
    
    // Add reward to user's wallet
    await prisma.wallet.update({
      where: { userId: staking.userId },
      data: { balance: { increment: dailyReward } }
    });

    // Record the reward
    await prisma.stakingReward.create({
      data: {
        stakingId: staking.id,
        userId: staking.userId,
        amount: dailyReward,
        rewardDate: new Date()
      }
    });
  }
}

export async function processMaturedStakings() {
  // This function should be called by a cron job daily
  const maturedStakings = await prisma.staking.findMany({
    where: {
      status: 'active',
      maturityDate: { lte: new Date() }
    }
  });

  for (const staking of maturedStakings) {
    // Unstake the principal amount
    await prisma.wallet.update({
      where: { userId: staking.userId },
      data: {
        balance: { increment: staking.amount },
        stakedBalance: { decrement: staking.amount }
      }
    });

    // Update staking status
    await prisma.staking.update({
      where: { id: staking.id },
      data: { status: 'completed' }
    });
  }
}
