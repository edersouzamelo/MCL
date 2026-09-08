import { spawnSync } from "node:child_process";

if (process.env.VERCEL !== "1") {
  console.log("MCL: migração automática ignorada fora da Vercel.");
  process.exit(0);
}

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("MCL: deploy Vercel sem DIRECT_URL/DATABASE_URL; migração recusada.");
  process.exit(1);
}

const executable = process.platform === "win32" ? "prisma.cmd" : "prisma";
const result = spawnSync(executable, ["migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
if (result.error) {
  console.error("MCL: não foi possível iniciar prisma migrate deploy:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
