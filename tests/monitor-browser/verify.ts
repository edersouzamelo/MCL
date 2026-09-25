/** Isolated local regression only. No real credentials, API writes or production data. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import * as XLSX from "xlsx";
import { mkdir } from "node:fs/promises";
import { parseSagWorkbook } from "../../src/modules/grupamento/sag";
import { parseRpnWorkbook } from "../../src/modules/grupamento/rpn";
import { defaultCcoMonitorConfig, GROUP_STORAGE_KEYS, CCO_SCREEN_CATALOG } from "../../src/modules/grupamento/monitor";

const origin = "http://127.0.0.1:3010";
const secret = "local-monitor-regression-test-secret-20260925";
function workbook(headers: string[], rows: unknown[][]) {
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ...rows]), "TESTE");
  return new Uint8Array(XLSX.write(book, { type: "buffer", bookType: "xlsx" })).buffer;
}
const rows = Array.from({ length: 26 }, (_, i) => [String(160100 + i), "OM TESTE " + i, "TESTE" + i, "PI DE TESTE " + i, 9000000, 500000, 0, 500000, 400000]);
const sag = parseSagWorkbook(workbook(["UG", "NOME_UG", "PI", "NOME_PI", "DISPONIVEL", "A_LIQUIDAR", "EM_LIQUIDACAO", "LIQUIDADO", "PAGO"], rows), "FIXTURE_SAG_TESTE.xlsx");
const rpn = parseRpnWorkbook(workbook(["UG", "NOME_UG", "PI", "NOME_PI", "TOTAL_A_LIQUIDAR", "TOTAL_LIQUIDADO", "CANC"], rows.map((r) => r.slice(0, 7))), "FIXTURE_RPN_TESTE.xlsx");
let revision = 1;
let failAsset = false;
const chart = { type: "bar", orientation: "vertical", grouping: "stacked", semanticVersion: 3, legendPosition: "bottom", xAxisTitle: "Período", yAxisTitle: "Quantidade", showGridlines: true, majorUnit: 20,
  series: [ { name: "Estoque OP", categories: ["Jan/26", "Fev/26", "Mar/26"], values: [10, 20, 30], color: "#008000" }, { name: "Estoque OM", categories: ["Jan/26", "Fev/26", "Mar/26"], values: [20, 40, 30], color: "#4f81bd" }, { name: "A receber", categories: ["Jan/26", "Fev/26", "Mar/26"], values: [30, 60, 10], color: "#eab308" } ] };
function scenes() { return [{ id: "test-scene", monitorId: 1, importId: "fixture", sceneOrder: 0, sceneType: "TEXT", title: "TESTE · Duração dos Estoques de QS", sourceFileName: "FIXTURE_QS.pptx", sourcePage: 1, sourceImportedAt: "2026-09-25", approvedAt: "2026-09-25", payload: { layoutVersion: 2, layout: { version: 2, width: 12192000, height: 6858000, elements: [
  { kind: "text", x: .05, y: .02, w: .9, h: .12, z: 1, fontSizePt: 24, text: `Duração dos Estoques de QS · TESTE v${revision}`, role: "title" },
  { kind: "chart", x: .04, y: .16, w: .92, h: .74, z: 2, chart },
  { kind: "image", x: .9, y: .91, w: .04, h: .06, z: 3, assetId: `fixture-image-${revision}` },
] } } }]; }
async function verify() {
const browser = await chromium.launch({ headless: true, executablePath: process.env.MONITOR_CHROMIUM_PATH, args: process.env.MONITOR_CHROMIUM_PATH ? ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu"] : undefined });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const token = await encode({ secret, token: { sub: "local-test-only", roles: ["ADMIN"], organizationId: "fixture-org" } });
await context.addCookies([{ name: "next-auth.session-token", value: token, url: origin }]);
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route("**/api/grupamento/sag/latest", (route) => route.fulfill({ json: { current: sag, rpn } }));
await context.route("**/api/grupamento/monitor-content/playlist?*", (route) => route.fulfill({ json: { scenes: scenes() } }));
await context.route("**/api/grupamento/monitor-content/assets/fixture-*", (route) => route.fulfill({ status: failAsset ? 503 : 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=", "base64") }));
await page.addInitScript(({ key, configs }) => localStorage.setItem(key, JSON.stringify(configs)), { key: GROUP_STORAGE_KEYS.monitors, configs: defaultCcoMonitorConfig().map((c) => c.id === 1 ? { ...c, label: "MONITOR · DADOS DE TESTE", screens: CCO_SCREEN_CATALOG.map((s) => s.id), delaySeconds: 5 } : c) });
await mkdir("test-results/monitor", { recursive: true });
await page.goto(origin + "/grupamento/monitor/1");
await expect(page.locator(".mcl-monitor-shell")).toBeVisible();
await page.waitForFunction(async () => (await caches.keys()).includes("mcl-monitor-navigation-v4") && (await (await caches.open("mcl-monitor-navigation-v4")).keys()).length > 0);
await expect(page.locator("header")).toContainText("DADOS DE TESTE");
console.log("PASS: production-built route, hydration, snapshot and navigation cache");
await page.getByLabel("Pausar apresentação").click();
for (const resolution of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  await page.setViewportSize(resolution);
  const samples: string[] = [];
  for (let n = 0; n < 8; n++) {
    samples.push(await page.locator("[data-monitor-viewport]").evaluate((node) => JSON.stringify({ scale: node.getAttribute("data-scale"), pages: node.getAttribute("data-page-count"), height: node.getBoundingClientRect().height, scroll: document.documentElement.scrollHeight, client: window.innerHeight })));
    await page.waitForTimeout(250);
  }
  expect(new Set(samples).size).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  console.log("PASS: stable frame", resolution, samples.at(-1));
}
await page.setViewportSize({ width: 1366, height: 768 });
await page.screenshot({ path: "test-results/monitor/structured.png" });
await expect(page.locator("footer")).not.toBeInViewport();
await page.mouse.move(700, 766); await expect(page.locator("footer")).toBeInViewport();
await page.mouse.move(700, 100); await expect(page.locator("footer")).not.toBeInViewport();
console.log("PASS: footer hover reveal/hide");
// Visit each structured scene without waiting through the full playlist.
for (let i = 0; i < 22; i++) {
  await page.getByLabel("Avançar quadro").click();
  await page.waitForTimeout(100);
  expect(Number(await page.locator("[data-monitor-viewport]").getAttribute("data-scale"))).toBeGreaterThanOrEqual(.86);
  if ((await page.locator("header").innerText()).includes("Duração dos Estoques")) break;
}
await expect(page.locator("[data-chart-legend]")).toContainText("Estoque OP");
await expect(page.locator("[data-chart-legend]")).toContainText("Estoque OM");
await expect(page.locator("[data-chart-legend]")).toContainText("A receber");
await expect(page.locator("[data-category-label]").first()).toContainText("Jan/26");
const first = Number(await page.locator('rect[data-series="Estoque OP"][data-value="10"]').getAttribute("height"));
const second = Number(await page.locator('rect[data-series="Estoque OP"][data-value="20"]').getAttribute("height"));
expect(second / first).toBeCloseTo(2);
await page.screenshot({ path: "test-results/monitor/chart.png" });
console.log("PASS: chart labels, legend, colors and proportional absolute stacks");
const oldSnapshot = await page.evaluate(async () => (await (await caches.open("mcl-monitor-snapshots-v4")).match("/grupamento/monitor/1/local-snapshot?organization=fixture-org"))!.json());
failAsset = true; revision = 2;
await page.evaluate(() => dispatchEvent(new Event("mcl-grupamento-document-content-updated")));
await page.waitForTimeout(1000);
expect(await page.evaluate(async () => (await (await (await caches.open("mcl-monitor-snapshots-v4")).match("/grupamento/monitor/1/local-snapshot?organization=fixture-org"))!.json()).version)).toBe(oldSnapshot.version);
console.log("PASS: failed asset never commits a partial playlist");
await context.setOffline(true);
await page.getByLabel("Retomar apresentação").click();
await page.waitForTimeout(6500);
await expect(page.getByLabel("Monitor offline")).toBeVisible();
await page.screenshot({ path: "test-results/monitor/offline.png" });
await page.reload({ waitUntil: "domcontentloaded" });
await expect(page.locator("header")).toContainText("DADOS DE TESTE");
await expect(page.getByLabel("Monitor offline")).toBeVisible();
expect(await page.locator(".mcl-monitor-boot").count()).toBe(0);
console.log("PASS: genuine network loss, continued loop and full offline reload");
failAsset = false;
await context.setOffline(false);
await page.waitForFunction(async (version) => (await (await (await caches.open("mcl-monitor-snapshots-v4")).match("/grupamento/monitor/1/local-snapshot?organization=fixture-org"))!.json()).version !== version, oldSnapshot.version);
await expect(page.getByLabel("Monitor online")).toBeVisible();
console.log("PASS: background synchronization after reconnect");
expect(errors).toEqual([]);
console.log("PASS: no browser page errors");
await browser.close();

}
verify().catch((error) => { console.error(error); process.exit(1); });
