import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const parts = await Promise.all([1, 2, 3, 4].map((part) =>
  readFile(new URL(`assets/guide-presentation/part-${part}.bin`, root))
));
const presentation = Buffer.concat(parts);
const expectedHash = "afd2d6976015fa84d13c559ae6b467b21a6c4de8515ed2fc557b9953665cc8a6";
if (createHash("sha256").update(presentation).digest("hex") !== expectedHash) {
  throw new Error("A apresentação do Guia Técnico está incompleta ou alterada.");
}
await mkdir(new URL("public/downloads/", root), { recursive: true });
const destination = new URL("public/downloads/mcl-salvador-13-set-26-final.pptx", root);
await writeFile(destination, presentation);
console.log(`Apresentação do Guia Técnico verificada: ${fileURLToPath(destination)}`);
