 import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateUserInput {
  email: string;
  phone: string;
  password: string;
  pin: string;
  referrerId?: number; // Make referrerId optional
}

export const UserModel = {
  async create(userData: CreateUserInput) {
    return prisma.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        pin: userData.pin,
        referrerId: userData.referrerId, // This can be undefined
        wallet: {
          create: {
            balance: 0.5, // Free 0.5 MVZx tokens
            address: await generateWalletAddress()
          }
        }
      },
      include: {
        wallet: true
      }
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { wallet: true }
    });
  },

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { wallet: true }
    });
  },

  async update(userId: number, data: any) {
    return prisma.user.update({
      where: { id: userId },
      data
    });
  }
};

async function generateWalletAddress(): Promise<string> {
  // Implement wallet address generation logic here
  // This is a simplified version - in production, use proper cryptographic methods
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `MVZx_${timestamp}_${random}`;
}
