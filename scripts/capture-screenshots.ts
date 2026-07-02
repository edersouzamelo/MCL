import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), "docs", "screenshots");

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto(`${baseURL}/entrar`);
  await page.screenshot({ path: path.join(outputDir, "login.png"), fullPage: true });
  await page.getByRole("button", { name: /Entrar em modo demonstrativo/i }).click();
  await page.waitForURL("**/painel");

  const targets = [
    ["dashboard.png", "/painel"],
    ["necessidade.png", "/necessidades/need-coturno-200"],
    ["passaporte-digital.png", "/unidades/ul-coturno-caixa-001"],
    ["scanner.png", "/scanner"],
    ["registro-evento.png", "/unidades/ul-coturno-caixa-001"],
    ["linha-do-tempo.png", "/necessidades/need-coturno-200"],
    ["conectores.png", "/conectores"],
    ["divergencias.png", "/divergencias"],
    ["auditoria.png", "/auditoria"],
  ] as const;

  for (const [fileName, route] of targets) {
    await page.goto(`${baseURL}${route}`);
    await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
  }

  await browser.close();
  console.log(`Capturas gravadas em ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
