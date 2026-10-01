import { Sandbox } from "@vercel/sandbox";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/server/db";
import { compilerHash } from "./scene-graph";

const IMAGE_VERSION = "mcl-native-ubuntu-fonts-v1";
let preparing: Promise<string> | undefined;

/** Snapshot only software/fonts, before any user document enters the VM. */
async function prepareSnapshot() {
  const cacheKey = compilerHash({ imageVersion: IMAGE_VERSION, project: process.env.VERCEL_PROJECT_ID });
  const key = { organizationId: "system:mcl-native-renderer", cacheKey };
  const cached = await prisma.monitorCompilerDecision.findUnique({ where: { organizationId_cacheKey: key } });
  const snapshotId = (cached?.decision as { snapshotId?: string } | undefined)?.snapshotId;
  if (snapshotId) return snapshotId;
  const sandbox = await Sandbox.create({ image: "vercel/sandbox/ubuntu", persistent: false, timeout: 180_000, resources: { vcpus: 2 } });
  try {
    const update = await sandbox.runCommand({ cmd: "apt-get", args: ["update", "-qq"], sudo: true });
    if (update.exitCode !== 0) throw new Error("Não foi possível preparar os pacotes do renderizador isolado.");
    const install = await sandbox.runCommand({ cmd: "apt-get", args: ["install", "-y", "--no-install-recommends", "python3", "libreoffice-impress", "libreoffice-writer", "poppler-utils", "fonts-crosextra-carlito", "fonts-crosextra-caladea", "fonts-liberation", "fonts-noto-core"], sudo: true });
    if (install.exitCode !== 0) throw new Error("Instalação do conversor nativo falhou.");
    const snapshot = await sandbox.snapshot({ expiration: 7 * 24 * 60 * 60 * 1000 });
    await prisma.monitorCompilerDecision.upsert({ where: { organizationId_cacheKey: key }, create: { ...key, model: IMAGE_VERSION, decision: { snapshotId: snapshot.snapshotId } }, update: { decision: { snapshotId: snapshot.snapshotId } } });
    return snapshot.snapshotId;
  } finally { await sandbox.stop().catch(() => undefined); }
}

/** Uses the project's OIDC identity. Each conversion has an isolated filesystem,
 * denied outbound networking, no public port and no saved user-data snapshot. */
export async function renderInSandbox(buffer: Buffer, format: "pptx" | "docx" | "pdf") {
  if (!process.env.VERCEL_OIDC_TOKEN || process.env.MCL_COMPILER_SANDBOX === "0") throw new Error("Renderização isolada da Vercel indisponível; configure o serviço nativo alternativo.");
  preparing ??= prepareSnapshot().finally(() => { preparing = undefined; });
  const snapshotId = await preparing;
  let sandbox: Sandbox;
  try {
    sandbox = await Sandbox.create({ source: { type: "snapshot", snapshotId }, persistent: false, timeout: 100_000, resources: { vcpus: 2 }, networkPolicy: "deny-all" });
  } catch (error) {
    // Expired/invalid snapshots can be rebuilt on the next import. Do not rerun
    // a document outside isolation or silently accept partial reconstruction.
    await prisma.monitorCompilerDecision.deleteMany({ where: { organizationId: "system:mcl-native-renderer", cacheKey: compilerHash({ imageVersion: IMAGE_VERSION, project: process.env.VERCEL_PROJECT_ID }) } });
    throw error;
  }
  try {
    const script = await readFile(join(process.cwd(), "workers/monitor-renderer/server.py"));
    const runner = "from pathlib import Path\nimport json\nfrom renderer import render\nsource = Path('/tmp/source." + format + "')\nresult = render(source.read_bytes(), '" + format + "')\nPath('/tmp/result.json').write_text(json.dumps(result))\n";
    await sandbox.writeFiles([{ path: "/tmp/renderer.py", content: script }, { path: "/tmp/run.py", content: Buffer.from(runner) }, { path: "/tmp/source." + format, content: buffer }]);
    const conversion = await sandbox.runCommand({ cmd: "python3", args: ["/tmp/run.py"] });
    if (conversion.exitCode !== 0) throw new Error("O conversor isolado não produziu uma referência íntegra.");
    const output = await sandbox.readFileToBuffer({ path: "/tmp/result.json" });
    if (!output || output.length > 68 * 1024 * 1024) throw new Error("Resposta isolada ausente ou acima do limite.");
    return JSON.parse(output.toString("utf8")) as unknown;
  } finally { await sandbox.stop(); }
}
