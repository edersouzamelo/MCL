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

      // Sincroniza o esquema do banco de dados na Vercel no primeiro acesso em produção
      if (process.env.NODE_ENV === "production" && !globalThis.hasOwnProperty("__db_pushed")) {
        try {
          console.log("MCL: Iniciando sincronizacao automatica do esquema com o banco...");
          execSync("npx prisma db push --accept-data-loss", {
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: "inherit",
          });
          console.log("MCL: Sincronizacao do banco finalizada com sucesso!");
          
          try {
            console.log("MCL: Populando dados iniciais (seeding) no banco de dados...");
            execSync("npx tsx prisma/seed.ts", {
              env: { ...process.env, DATABASE_URL: dbUrl },
              stdio: "inherit",
            });
            console.log("MCL: Dados populados com sucesso!");
          } catch (seedErr) {
            console.error("MCL: Falha na populacao automatica de dados:", seedErr);
          }

          (globalThis as any).__db_pushed = true;
        } catch (err) {
          console.error("MCL: Falha na sincronizacao automatica do banco:", err);
        }
      }

      globalForPrisma.prisma = new PrismaClient({
        accelerateUrl: dbUrl,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      } as any);
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
