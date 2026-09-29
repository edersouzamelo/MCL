/** Local visual regression using explicitly labeled test data. No production data or writes. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { mkdir, readFile } from "node:fs/promises";
import { defaultCcoMonitorConfig } from "../../src/modules/grupamento/monitor";

async function verify() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MONITOR_CHROMIUM_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const token = await encode({ secret: "local-briefing-verification-secret", token: { sub: "local-test-only", name: "DADOS DE TESTE", roles: ["ADMIN"], organizationId: "fixture-org" } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: "http://127.0.0.1:3010" }, { name: "mcl_onboarding_completed", value: "true", url: "http://127.0.0.1:3010" }]);
  const monitors = defaultCcoMonitorConfig().map((m) => ({ ...m, layout: "briefing", screens: [] }));
  const scene = { id: "test-scene", monitorId: 1, importId: "fixture", sceneOrder: 0, sceneType: "TEXT", title: "DADOS DE TESTE", sourceFileName: "FIXTURE_TESTE.pptx", sourcePage: 1, sourceImportedAt: "2026-09-29T15:00:00Z", sourceImportedByName: "TESTE", approvedAt: "2026-09-29", payload: { layoutVersion: 2, layout: { version: 2, width: 12192000, height: 6858000, elements: [
    { kind: "text", x: .05, y: .02, w: .9, h: .12, z: 1, fontSizePt: 24, text: "DADOS DE TESTE", role: "title" },
    { kind: "chart", x: .04, y: .16, w: .92, h: .74, z: 2, chart: { type: "bar", grouping: "stacked", series: [{ name: "TESTE", categories: ["Jan", "Fev", "Mar"], values: [10, 20, 30], color: "#008000" }] } },
  ] } } };
  await context.route("**/api/grupamento/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/sag/latest")) return route.fulfill({ json: { current: null, rpn: null } });
    if (url.pathname.endsWith("/playlist")) return route.fulfill({ json: { scenes: [scene] } });
    if (url.pathname.endsWith("/briefing-export")) {
      expect(route.request().method()).toBe("POST");
      return route.fulfill({ body: await readFile("/tmp/mcl-briefing-test/TESTE-briefing.pptx"), headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": 'attachment; filename="TESTE-briefing.pptx"' } });
    }
    if (url.pathname.endsWith("/monitors/1") && route.request().method() === "PUT") {
      monitors[0] = route.request().postDataJSON();
      return route.fulfill({ json: { monitor: monitors[0] } });
    }
    if (url.pathname.endsWith("/monitors")) return route.fulfill({ json: { monitors } });
    return route.fulfill({ json: { imports: [], devices: [] } });
  });
  const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3010/grupamento/monitor/1?capture=1");
  await expect(page.locator(".mcl-briefing-frame")).toBeVisible();
  await expect(page.locator("[data-mcl-capture-ready='1']")).toBeVisible();
  await expect(page.locator("main")).toContainText("Classe I");
  await expect(page.locator("main")).toContainText("Atualizado em 29 SET 26");
  expect(await page.locator(".mcl-monitor-header, .mcl-monitor-footer, .mcl-monitor-shell").count()).toBe(0);
  await mkdir("/tmp/mcl-briefing-test", { recursive: true });
  for (const size of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(500);
    const bounds = await page.locator(".mcl-briefing-frame").boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(size.width + 1); expect(bounds!.height).toBeLessThanOrEqual(size.height + 1);
    await page.screenshot({ path: `/tmp/mcl-briefing-test/browser-${size.width}.png` });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("http://127.0.0.1:3010/grupamento");
  await expect(page.getByRole("button", { name: "Exportar Briefing Logístico atual" })).toBeEnabled();
  const layout = page.locator("select").filter({ has: page.locator('option[value="briefing"]') }).first();
  await expect(layout).toContainText("Modo escuro"); await expect(layout).toContainText("Modo claro"); await expect(layout).toContainText("Modo Briefing");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar Briefing Logístico atual" }).click();
  expect((await download).suggestedFilename()).toBe("TESTE-briefing.pptx");
  expect(errors).toEqual([]);
  console.log("PASS: Briefing sem moldura MCL, data/classe, três resoluções, layouts e download PPTX (fixture explícita).");
  await browser.close();
}
verify().catch((e) => { console.error(e); process.exit(1); });
