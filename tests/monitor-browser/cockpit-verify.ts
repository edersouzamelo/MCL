/** Local browser regression. API fixtures below never reach production or its database. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { defaultCcoMonitorConfig } from "../../src/modules/grupamento/monitor";
const origin = "http://127.0.0.1:3010";
async function verify() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MONITOR_CHROMIUM_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const token = await encode({ secret: "local-monitor-regression-test-secret-20260925", token: { sub: "local-test-only", name: "Operador de teste", roles: ["ADMIN"], organizationId: "fixture-org" } });
  await page.context().addCookies([{ name: "next-auth.session-token", value: token, url: origin }, { name: "mcl_onboarding_completed", value: "true", url: origin }]);
  const configs = defaultCcoMonitorConfig().map((config) => ({ ...config, updatedByName: "Responsável de teste", updatedAt: "2026-10-01T04:23:00.000Z" }));
  let writes = 0;
  await page.route("**/api/grupamento/**", async (route) => {
    const url = new URL(route.request().url());
    if (/\/monitors\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split("/").pop());
      const next = route.request().postDataJSON();
      configs[id - 1] = { ...next, updatedByName: "Operador de teste", updatedAt: "2026-10-01T05:00:00.000Z" }; writes++;
      return route.fulfill({ json: { monitor: configs[id - 1] } });
    }
    return route.fulfill({ json: url.pathname.endsWith("/monitors") ? { monitors: configs } : url.pathname.endsWith("/sag/latest") ? { current: null, rpn: null } : { imports: [], devices: [] } });
  });
  await page.goto(`${origin}/grupamento`);
  await expect(page.getByRole("button", { name: "Configurar Monitor 1", exact: true })).toBeEnabled();
  await expect(page.locator('.ccol-monitor-trigger')).toHaveCount(10);
  await expect.poll(async () => await page.locator('.ccol-monitor-screen img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.locator('.ccol-monitor-screen img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.locator('.ccol-monitor-screen img').nth(3).getAttribute('src')).toBe(await page.locator('.ccol-monitor-screen img').nth(4).getAttribute('src'));
  await expect(page.locator('.ccol-monitor-divider')).toHaveCount(2);
  await page.locator('.ccol-monitor-trigger').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/workspace/scratch/55a592607734/panel.png", fullPage: true });
  await page.getByRole("button", { name: "Configurar Monitor 1", exact: true }).click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Responsável de teste");
  await expect(dialog).toContainText("01/10/2026, 00:23:00");
  await expect(dialog.locator('.ccol-command')).toHaveCount(6);
  const boxes = await dialog.locator('.ccol-command').evaluateAll((elements) => elements.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  expect(boxes[0].y).toBe(boxes[1].y); expect(boxes[1].y).toBe(boxes[2].y); expect(boxes[3].y).toBe(boxes[4].y); expect(boxes[4].y).toBe(boxes[5].y); expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
  await dialog.getByRole('button', { name: 'Configurar', exact: true }).click();
  await expect(dialog.getByLabel('Responsável pelo Monitor 1')).toBeVisible();
  await dialog.getByLabel('Responsável pelo Monitor 1').selectOption('Classe II');
  await expect.poll(() => writes).toBe(1);
  await dialog.getByRole('button', { name: 'Incluir conteúdo orçamentário' }).click();
  await expect(dialog.getByLabel('Responsável pelo Monitor 1')).toBeHidden();
  await expect(dialog.locator('[aria-expanded=true]')).toContainText('Incluir conteúdo orçamentário');
  await dialog.getByRole('button', { name: 'Incluir conteúdo documental' }).click();
  await expect(dialog.getByText('Cockpit de apresentação')).toBeVisible();
  await dialog.getByRole('button', { name: 'Incluir conteúdo documental' }).click();
  await expect(dialog.getByText('Cockpit de apresentação')).toBeHidden();
  await page.screenshot({ path: "/workspace/scratch/55a592607734/commands.png" });
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Configurar Monitor 1', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(dialog.locator('.ccol-command')).toHaveCount(6);
  await page.screenshot({ path: "/workspace/scratch/55a592607734/commands-mobile.png" });
  expect(errors).toEqual([]);
  await browser.close();
  console.log('PASS: 10 monitores, capas, divisão central, modal, seis comandos em 3×2, autoria, alteração persistida, expansão/recolhimento, Escape e largura móvel.');
}
verify().catch((error) => { console.error(error); process.exit(1); });
