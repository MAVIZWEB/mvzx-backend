 // src/services/walletService.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function credit(userId:number, token:string, amount:number) {
  const b = await prisma.balance.findFirst({ where:{ userId, token } });
  if (b) {
    await prisma.balance.update({ where:{ id: b.id }, data:{ amount: b.amount + amount }});
  } else {
    await prisma.balance.create({ data:{ userId, token, amount }});
  }
}
