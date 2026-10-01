/** A green preview must include real native conversion, not only compilation.
 * Generated input is entirely synthetic. Never load an operational document here. */
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { extractMonitorDocument } from "../src/modules/grupamento/monitor-content/extract";
import { prisma } from "../src/server/db";

async function verify() {
  if (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "preview") {
    console.log("MCL compiler: cloud smoke check applies to Vercel previews."); return;
  }
  const directory = await mkdtemp(join(tmpdir(), "mcl-compiler-smoke-"));
  try {
    execFileSync(process.execPath, ["tests/fixtures/monitor-compiler/generate.mjs", directory], { stdio: "ignore" });
    const result = await extractMonitorDocument(await readFile(join(directory, "heterogeneous.pptx")), "heterogeneous.pptx");
    if (result.scenes.length !== 8 || result.scenes.some(scene => scene.payload.inputCompiler?.preflight.status !== "PASS")) throw new Error("Native conversion/fidelity check failed. Inspect renderer configuration and project Sandbox identity.");
    if (!result.scenes.some(scene => scene.payload.inputCompiler?.strategy === "NATIVE_FALLBACK" && scene.payload.inputCompiler.nativeReference)) throw new Error("Native fallback was not exercised.");
    console.log("MCL compiler: 8 synthetic archetypes passed actual cloud native conversion.");
  } finally { await rm(directory, { recursive: true, force: true }); await prisma.$disconnect(); }
}
verify().catch(error => { console.error("MCL compiler deployment check:", error instanceof Error ? error.message : "failed"); process.exit(1); });
