import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
type Archive = {
  pipe: (stream: NodeJS.WritableStream) => void;
  file: (source: string, data: { name: string }) => Archive;
  append: (source: string, data: { name: string }) => Archive;
  finalize: () => Promise<void>;
  on: (event: "error", listener: (error: Error) => void) => Archive;
};
const { ZipArchive } = require("archiver") as {
  ZipArchive: new (options: { zlib: { level: number } }) => Archive;
};

const root = process.cwd();
const releaseDir = path.join(root, "dist", "release");
const zipName = "mcl-piloto-classe-ii-v0.1.0.zip";
const zipPath = path.join(releaseDir, zipName);
const excludedNames = new Set([
  ".env",
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function runPnpm(script: string) {
  const pnpmCli = process.env.npm_execpath;
  const command = pnpmCli ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = pnpmCli ? [pnpmCli, script] : [script];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${script} falhou com codigo ${result.status}: ${result.error?.message ?? "sem erro detalhado"}`);
  }
}

async function walk(directory: string, base = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (
      excludedNames.has(entry.name) ||
      entry.name.endsWith(".local") ||
      entry.name.endsWith(".tsbuildinfo") ||
      /^dev-server.*\.log$/.test(entry.name)
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, base)));
    } else {
      files.push(path.relative(base, fullPath).replaceAll("\\", "/"));
    }
  }
  return files;
}

async function sha256(filePath: string) {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve());
  });
  return hash.digest("hex");
}

async function main() {
  runPnpm("lint");
  runPnpm("typecheck");
  runPnpm("test");
  runPnpm("build");

  await mkdir(releaseDir, { recursive: true });
  const files = (await walk(root)).sort();
  const manifest = {
    name: zipName,
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    excludes: [...excludedNames].sort(),
    files: await Promise.all(
      files.map(async (file) => {
        const fileStat = await stat(path.join(root, file));
        return { path: file, bytes: fileStat.size };
      }),
    ),
  };
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(releaseDir, "release-manifest.json"), manifestJson);

  await new Promise<void>((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const output = createWriteStream(zipPath);
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    for (const file of files) {
      archive.file(path.join(root, file), { name: file });
    }
    archive.append(manifestJson, { name: "release-manifest.json" });
    archive.finalize().catch(reject);
  });

  const digest = await sha256(zipPath);
  await writeFile(path.join(releaseDir, "SHA256SUMS.txt"), `${digest}  ${zipName}\n`);
  const readme = await readFile(path.join(root, "README.md"), "utf8").catch(() => "");
  if (readme.includes("DOI:")) {
    throw new Error("README contem DOI manual. Atualize somente depois de DOI emitido.");
  }
  console.log(`Artefato gerado: ${zipPath}`);
  console.log(`SHA256: ${digest}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
