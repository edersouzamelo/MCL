import { Sandbox } from "@vercel/sandbox";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/server/db";
import { compilerHash } from "./scene-graph";

type RendererProfile = "pdf" | "office";

const IMAGE_VERSION: Record<RendererProfile, string> = {
  pdf: "mcl-native-pdf-poppler-v1",
  office: "mcl-native-office-fonts-v2",
};
const preparing = new Map<RendererProfile, Promise<string>>();

function profileFor(format: "pptx" | "docx" | "pdf"): RendererProfile {
  return format === "pdf" ? "pdf" : "office";
}

function cacheKeyFor(profile: RendererProfile) {
  return compilerHash({ imageVersion: IMAGE_VERSION[profile], project: process.env.VERCEL_PROJECT_ID });
}

async function invalidateSnapshot(profile: RendererProfile) {
  await prisma.monitorCompilerDecision.deleteMany({
    where: { organizationId: "system:mcl-native-renderer", cacheKey: cacheKeyFor(profile) },
  });
}

/** Snapshot only software/fonts, before any user document enters the VM.
 * PDFs do not install LibreOffice: poppler alone is enough to render the original
 * page faithfully and keeps the first validation inside the request budget. */
async function prepareSnapshot(profile: RendererProfile) {
  const cacheKey = cacheKeyFor(profile);
  const key = { organizationId: "system:mcl-native-renderer", cacheKey };
  const cached = await prisma.monitorCompilerDecision.findUnique({ where: { organizationId_cacheKey: key } });
  const snapshotId = (cached?.decision as { snapshotId?: string } | undefined)?.snapshotId;
  if (snapshotId) return snapshotId;

  const sandbox = await Sandbox.create({
    image: "vercel/sandbox/ubuntu",
    persistent: false,
    timeout: profile === "pdf" ? 180_000 : 260_000,
    resources: { vcpus: 2 },
  });
  try {
    const update = await sandbox.runCommand({ cmd: "apt-get", args: ["update", "-qq"], sudo: true });
    if (update.exitCode !== 0) throw new Error("Não foi possível preparar os pacotes do renderizador isolado.");
    const packages = profile === "pdf"
      ? ["python3", "poppler-utils", "fonts-liberation", "fonts-noto-core"]
      : ["python3", "libreoffice-impress", "libreoffice-writer", "poppler-utils", "fonts-crosextra-carlito", "fonts-crosextra-caladea", "fonts-liberation", "fonts-noto-core"];
    const install = await sandbox.runCommand({ cmd: "apt-get", args: ["install", "-y", "--no-install-recommends", ...packages], sudo: true });
    if (install.exitCode !== 0) throw new Error("Instalação do conversor nativo falhou.");
    const snapshot = await sandbox.snapshot({ expiration: 7 * 24 * 60 * 60 * 1000 });
    await prisma.monitorCompilerDecision.upsert({
      where: { organizationId_cacheKey: key },
      create: { ...key, model: IMAGE_VERSION[profile], decision: { snapshotId: snapshot.snapshotId } },
      update: { model: IMAGE_VERSION[profile], decision: { snapshotId: snapshot.snapshotId } },
    });
    return snapshot.snapshotId;
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

async function getPreparedSnapshot(profile: RendererProfile) {
  const current = preparing.get(profile);
  if (current) return current;
  const promise = prepareSnapshot(profile).finally(() => { preparing.delete(profile); });
  preparing.set(profile, promise);
  return promise;
}

async function createConversionSandbox(profile: RendererProfile) {
  const create = (snapshotId: string) => Sandbox.create({
    source: { type: "snapshot" as const, snapshotId },
    persistent: false,
    timeout: 100_000,
    resources: { vcpus: 2 },
    networkPolicy: "deny-all" as const,
  });

  let snapshotId = await getPreparedSnapshot(profile);
  try {
    return await create(snapshotId);
  } catch {
    // Snapshot expirado/corrompido é uma falha interna transitória. Refaça-o
    // automaticamente na mesma importação; o operador não deve clicar de novo.
    await invalidateSnapshot(profile);
    snapshotId = await getPreparedSnapshot(profile);
    return create(snapshotId);
  }
}

/** Uses the project's OIDC identity. Each conversion has an isolated filesystem,
 * denied outbound networking, no public port and no saved user-data snapshot. */
export async function renderInSandbox(buffer: Buffer, format: "pptx" | "docx" | "pdf") {
  if (process.env.MCL_COMPILER_SANDBOX === "0") throw new Error("Renderização isolada da Vercel desativada; configure o serviço nativo alternativo.");
  const profile = profileFor(format);
  const sandbox = await createConversionSandbox(profile);
  try {
    const script = await readFile(join(process.cwd(), "workers/monitor-renderer/server.py"));
    const runner = "from pathlib import Path\nimport json\nfrom renderer import render\nsource = Path('/tmp/source." + format + "')\nresult = render(source.read_bytes(), '" + format + "')\nPath('/tmp/result.json').write_text(json.dumps(result))\n";
    await sandbox.writeFiles([
      { path: "/tmp/renderer.py", content: script },
      { path: "/tmp/run.py", content: Buffer.from(runner) },
      { path: "/tmp/source." + format, content: buffer },
    ]);
    const conversion = await sandbox.runCommand({ cmd: "python3", args: ["/tmp/run.py"] });
    if (conversion.exitCode !== 0) throw new Error("O conversor isolado não produziu uma referência íntegra.");
    const output = await sandbox.readFileToBuffer({ path: "/tmp/result.json" });
    if (!output || output.length > 68 * 1024 * 1024) throw new Error("Resposta isolada ausente ou acima do limite.");
    return JSON.parse(output.toString("utf8")) as unknown;
  } finally {
    await sandbox.stop();
  }
}
