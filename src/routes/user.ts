 import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateUserInput {
  email: string;
  phone: string;
  password: string;
  pin: string;
  referrerId?: number;
}

export const UserModel = {
  async create(userData: CreateUserInput) {
    const data: any = {
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      pin: userData.pin,
      wallet: {
        create: {
          balance: 0.5,
          address: await generateWalletAddress()
        }
      }
    };

    // Only add referrerId if it's provided
    if (userData.referrerId !== undefined) {
      data.referrerId = userData.referrerId;
    }

    return prisma.user.create({
      data,
      include: {
        wallet: true
      }
    });
  },

  // ... rest of the methods remain the same
};

async function generateWalletAddress(): Promise<string> {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `MVZx_${timestamp}_${random}`;
}
