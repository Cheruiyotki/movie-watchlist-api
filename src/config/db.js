import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

export const connectDB = async () => {
  try {
    // With adapters, a simple query is the best way to "test" the connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB Connected via Neon Serverless Adapter");
  } catch (error) {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
};