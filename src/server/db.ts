/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

import { execSync } from "child_process";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Instanciação preguiçosa (Lazy) do PrismaClient usando Proxy JavaScript.
// Evita a validação de construtor do Prisma 7 durante a execução de testes em memória (sem DATABASE_URL).
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error(
          "DATABASE_URL nao configurada. O PrismaClient nao pode ser instanciado no modo de fallback em memoria."
        );
      }

      globalForPrisma.prisma = new PrismaClient({
        accelerateUrl: dbUrl,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      } as any);
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
