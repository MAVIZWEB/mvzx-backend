 datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          Int       @id @default(autoincrement())
  email       String?   @unique
  pinHash     String
  wallet      String    @unique
  balance     Float     @default(0)
  referralId  Int?
  createdAt   DateTime  @default(now())
  purchases   Purchase[]
  matrix      Matrix[]
  stakes      Stake[]
}

model Purchase {
  id        Int      @id @default(autoincrement())
  userId    Int
  amount    Float
  currency  String
  matrixAssigned Boolean @default(false)
  createdAt DateTime @default(now())
}

model Matrix {
  id        Int      @id @default(autoincrement())
  userId    Int
  stage     Int
  position  Int
  earnings  Float    @default(0)
  legsFilled Int     @default(0)
  completed  Boolean @default(false)
  createdAt DateTime @default(now())
}

model Stake {
  id         Int      @id @default(autoincrement())
  userId     Int
  amount     Float
  startDate  DateTime @default(now())
  endDate    DateTime
  claimed    Boolean  @default(false)
}
