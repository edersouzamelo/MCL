/** Isolated fixtures exercise UI; persistence and authorization are covered by unit contracts. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { buildOfflineHtml } from "../../src/modules/grupamento/monitor-offline-html";
import { normalizeMonitorTitle } from "../../src/modules/grupamento/monitor-content/presentation-title";
import { optimizeEditorElements } from "../../src/modules/grupamento/monitor-content/online-editor";
import type { MonitorDocumentSceneDto, MonitorSlideElement } from "../../src/modules/grupamento/monitor-content/types";
async function run() {
  const browser = await chromium.launch({ executablePath: process.env.MONITOR_CHROMIUM_PATH, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1600, height: 1000 } });
  const origin = "http://127.0.0.1:3010", page = await context.newPage(), errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const token = await encode({ secret: "local-monitor-regression-test-secret-20260925", token: { sub: "local-test-only", name: "Operador de teste", roles: ["ADMIN"], organizationId: "fixture-org" } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: origin }]);
  let scenes: MonitorDocumentSceneDto[] = [{ id: "123e4567-e89b-42d3-a456-426614174000", importId: "123e4567-e89b-42d3-a456-426614174001", monitorId: 1, sceneOrder: 0, sceneType: "CHART", title: "Créditos disponíveis", sourceFileName: "fixture.pptx", sourcePage: 1, sourceImportedAt: "2026-10-01", sourceImportedByName: "Teste", approvedAt: "2026-10-01", payload: { layoutVersion: 2, extractionVersion: 5, layout: { version: 2, width: 12192000, height: 6858000, elements: [ { kind: "chart", chart: { type: "bar", series: [{ name: "Crédito", categories: ["Classe I", "Classe II"], values: [42, 63], color: "#0284c7" }] }, x: .05, y: .15, w: .9, h: .65, z: 1 }, { kind: "text", text: "Nota documental", x: .1, y: .85, w: .8, h: .1, z: 2 } ] } } }];
  let writes = 0;
  await page.route("**/api/grupamento/**", async route => {
    if (route.request().method() === "POST") return route.fulfill({ json: { assetId: "123e4567-e89b-42d3-a456-426614174002" } });
    if (route.request().url().includes("/assets/")) return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
    if (route.request().method() === "PUT") {
      const input = route.request().postDataJSON(); writes++;
      scenes = scenes.map(scene => { const change = input.scenes.find((value: {id: string}) => value.id === scene.id); return change ? { ...scene, title: normalizeMonitorTitle(change.title), payload: { ...scene.payload, onlineEditor: { version: 1, revision: change.revision + 1 }, layout: { ...scene.payload.layout!, elements: optimizeEditorElements(change.elements as MonitorSlideElement[]) } } } : scene; });
    }
    return route.fulfill({ json: { scenes } });
  });
  await page.goto(origin + "/grupamento/monitor-editor/1");
  await expect(page.getByLabel("Nome da tela")).toHaveValue("Créditos disponíveis");
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await page.getByLabel("Texto do objeto", { exact: true }).fill("Comentário corrigido");
  await expect(page.getByLabel("Texto do objeto", { exact: true })).toHaveValue("Comentário corrigido");
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page.getByRole("button", { name: "Refazer", exact: true }).click();
  await page.getByRole("button", { name: "Selecionar texto 3", exact: true }).click();
  await page.getByLabel("Largura %").fill("55");
  await expect(page.getByLabel("Largura %")).toHaveValue("55");
  const object = page.getByRole("button", { name: "Selecionar texto 3", exact: true });
  const box = await object.boundingBox(); if (!box) throw new Error("Objeto não visível");
  await page.mouse.move(box.x + 30, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 90, box.y + 50, { steps: 4 }); await page.mouse.up();
  expect(Number(await page.getByLabel("Esquerda %").inputValue())).toBeGreaterThan(10);
  const handle = page.locator('.mcl-editor-resize'); const handleBox = await handle.boundingBox(); if (!handleBox) throw new Error("Alça não visível");
  await page.mouse.move(handleBox.x + 5, handleBox.y + 5); await page.mouse.down(); await page.mouse.move(handleBox.x + 40, handleBox.y + 25, {steps: 3}); await page.mouse.up();
  expect(Number(await page.getByLabel("Largura %").inputValue())).toBeGreaterThan(55);
  await page.getByRole("button", { name: "Apagar objeto" }).click(); await expect(object).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click(); await expect(object).toHaveCount(1);
  await page.getByRole("button", { name: "Selecionar gráfico 1", exact: true }).click();
  await page.getByLabel("Classe I", { exact: true }).fill("#ff0000");
  await page.getByLabel("Nome da tela").fill("NÃO PODER ESCREVER-ASSIM");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Salvo"); expect(writes).toBe(1);
  await expect(page.getByLabel("Nome da tela")).toHaveValue("Não poder escrever assim");
  await expect(page.locator('rect[data-value="42"]').last()).toHaveAttribute("fill", "#ff0000");
  const chart = scenes[0].payload.layout!.elements.find(item => item.kind === "chart"); expect(chart?.kind === "chart" && chart.chart.series[0].values).toEqual([42,63]); expect(chart?.kind === "chart" && chart.chart.series[0].pointColors?.[0]).toBe("#ff0000");
  await page.screenshot({ path: "/workspace/scratch/55a592607734/editor.png", fullPage: true });
  await page.reload(); await expect(page.getByLabel("Nome da tela")).toHaveValue("Não poder escrever assim");
  await page.getByRole("button", { name: "Forma", exact: true }).click();
  await page.getByLabel("Preenchimento").fill("#00aa00");
  await page.getByRole("button", { name: "Apagar objeto" }).click();
  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=","base64")});
  await expect(page.getByRole("button", {name:"Selecionar imagem 4",exact:true})).toHaveCount(1);
  await page.getByRole("button", { name: "Apagar objeto" }).click();
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Visualizar", exact: true }).click(); await expect(page.locator('.mcl-editor-overlay')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/workspace/scratch/55a592607734/editor-mobile.png", fullPage: true });
  const offline = await context.newPage(); await offline.clock.install();
  await offline.setContent(buildOfflineHtml(1, [0,1,2].map(index => ({ html: `<main data-frame="${index}">Quadro ${index}</main>`, label: `Quadro ${index}` })), 5));
  await expect(offline.locator('#controls button')).toHaveCount(5);
  const position = await offline.locator('#controls').boundingBox(); expect(position!.y).toBeLessThan(30);
  await offline.getByRole("button", { name: "Pausar apresentação", exact: true }).click(); await offline.clock.runFor(6000); await expect(offline.locator('[data-frame]')).toHaveAttribute('data-frame','0');
  await offline.getByRole("button", { name: "Avançar quadro", exact: true }).click(); await offline.clock.runFor(400); await expect(offline.locator('[data-frame]')).toHaveAttribute('data-frame','1');
  await offline.getByRole("button", { name: "Parar apresentação", exact: true }).click(); await offline.clock.runFor(400); await expect(offline.locator('[data-frame]')).toHaveAttribute('data-frame','0');
  await expect(offline.getByRole('button',{name:'Parar apresentação',exact:true})).toHaveAttribute('aria-pressed','true');
  await offline.getByRole("button", { name: "Reproduzir apresentação", exact: true }).click(); await offline.clock.runFor(5500); await expect(offline.locator('[data-frame]')).toHaveAttribute('data-frame','1');
  await offline.getByRole("button", { name: "Avançar quadro", exact: true }).click(); await offline.getByRole("button", { name: "Parar apresentação", exact: true }).click(); await offline.clock.runFor(400); await expect(offline.locator('[data-frame]')).toHaveAttribute('data-frame','0');
  expect(errors).toEqual([]); await browser.close(); console.log("Editor e HTML offline: seleção, texto, drag, resize, desfazer, apagar, cores, salvar, recarregar, mobile e cinco controles aprovados.");
}
run().catch(error => { console.error(error); process.exit(1); });
