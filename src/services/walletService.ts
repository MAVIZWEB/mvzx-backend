 import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function credit(userId: number, token: string, amount: number) {
  const existing = await prisma.balance.findFirst({ where: { userId, token } });
  if (existing) {
    await prisma.balance.update({ where: { id: existing.id }, data: { amount: existing.amount + amount }});
  } else {
    await prisma.balance.create({ data: { userId, token, amount }});
  }
}
