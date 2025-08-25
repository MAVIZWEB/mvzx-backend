import { PrismaClient } from "@prisma/client";

// Ensure single instance (prevents multiple connections in dev)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: ["query", "info", "warn", "error"], // optional
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
