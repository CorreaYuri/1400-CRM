import { PrismaClient } from "@prisma/client";
import { env } from "@/server/env";

declare global {
  var prisma: PrismaClient | undefined;
}

void env;

export const db = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}
