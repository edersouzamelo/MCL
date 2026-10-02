/** Browser interaction regression using explicit synthetic fixtures.
 * API persistence/authorization are tested separately; this does not certify a live database. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { prepareEditorScene } from "../../src/modules/grupamento/monitor-content/online-editor";
import type {
  MonitorDocumentSceneDto,
  MonitorSlideElement,
} from "../../src/modules/grupamento/monitor-content/types";
const origin = "http://127.0.0.1:3010";
const secret = "local-monitor-regression-test-secret-20260925";
async function run() {
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "-p",
      "3010",
    ],
    {
      env: { ...process.env, AUTH_SECRET: secret, NEXTAUTH_URL: origin },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  server.stdout.on("data", (data) => (logs += data));
  server.stderr.on("data", (data) => (logs += data));
  const output =
    process.env.MCL_EDITOR_TEST_OUTPUT ?? "/tmp/mcl-editor-verification";
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.MONITOR_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        await fetch(origin + "/entrar", { signal: AbortSignal.timeout(2000) });
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!ready) throw new Error("Dev server unavailable: " + logs);
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      serviceWorkers: "block",
    });
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: await encode({
          secret,
          token: {
            sub: "editor-fixture",
            name: "Operador de teste",
            roles: ["ADMIN"],
            organizationId: "fixture-org",
          },
        }),
        url: origin,
      },
    ]);
    const page = await context.newPage(),
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let published: MonitorDocumentSceneDto[] = [
      {
        id: "123e4567-e89b-42d3-a456-426614174000",
        importId: "123e4567-e89b-42d3-a456-426614174001",
        monitorId: 1,
        sceneOrder: 0,
        sceneType: "TEXT",
        title: "Revisão do abastecimento",
        sourceFileName: "editor-fixture.pptx",
        sourcePage: 1,
        sourceImportedAt: "2026-10-01",
        sourceImportedByName: "Fixture",
        approvedAt: "2026-10-01",
        payload: {
          onlineEditor: { version: 1, revision: 0 },
          layoutVersion: 2,
          layout: {
            version: 2,
            width: 12192000,
            height: 6858000,
            elements: [
              {
                kind: "text",
                elementId: "a",
                text: "Recursos recebidos",
                fontFace: "Arial",
                fontSizePt: 24,
                x: 0.12,
                y: 0.12,
                w: 0.45,
                h: 0.18,
                z: 1,
              },
              {
                kind: "text",
                elementId: "b",
                text: "Anotação operacional",
                fontSizePt: 20,
                x: 0.12,
                y: 0.48,
                w: 0.45,
                h: 0.2,
                z: 2,
              },
              {
                kind: "shape",
                elementId: "c",
                fill: "#c0dfd0",
                x: 0.7,
                y: 0.2,
                w: 0.2,
                h: 0.3,
                z: 0,
              },
            ],
          },
        },
      },
    ];
    published.push({ ...published[0], id: "123e4567-e89b-42d3-a456-426614174010", sceneOrder: 1, title: "Gráfico e tabela", payload: {onlineEditor:{version:1,revision:0},layoutVersion:2,layout:{version:2,width:12192000,height:6858000,elements:[
      {kind:"chart",elementId:"chart",x:.03,y:.05,w:.47,h:.4,z:1,chart:{type:"bar",title:"Recebidos",series:[{name:"Recursos",categories:["Classe I","Classe II"],values:[42,63],color:"#0284c7"}]}},
      {kind:"table",elementId:"table",x:.55,y:.05,w:.42,h:.4,z:2,columns:["PI","Valor"],rows:[["BIDS","42"],["Fardamento","63"]]},
      {kind:"image",elementId:"image",assetId:"123e4567-e89b-42d3-a456-426614174002",x:.03,y:.55,w:.3,h:.3,z:3},
      {kind:"text",elementId:"note",text:"Nota de revisão",x:.55,y:.55,w:.42,h:.15,z:4,fontSizePt:24}
    ]}}});
    type Draft = {
      sceneId: string;
      revision: number;
      baseRevision: number;
      content: { title: string; elements: MonitorSlideElement[] };
    };
    let drafts: Draft[] = [],
      draftWrites = 0,
      publications = 0,
      conflict = false;
    await page.route("**/api/grupamento/**", async (route) => {
      const req = route.request();
      if (req.url().endsWith("/editor/images"))
        return route.fulfill({
          json: {
            assetId: "123e4567-e89b-42d3-a456-426614174002",
            width: 400,
            height: 200,
          },
        });
      if (req.url().includes("/assets/"))
        return route.fulfill({
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      if (req.method() === "PUT") {
        const data = req.postDataJSON();
        draftWrites++;
        drafts = data.scenes.map(
          (s: {
            id: string;
            revision: number;
            draftRevision: number;
            title: string;
            elements: MonitorSlideElement[];
          }) => ({
            sceneId: s.id,
            revision: s.draftRevision + 1,
            baseRevision: s.revision,
            content: { title: s.title, elements: s.elements },
          }),
        );
        return route.fulfill({
          json: {
            saved: drafts.map((d) => ({
              sceneId: d.sceneId,
              revision: d.revision,
            })),
          },
        });
      }
      if (req.method() === "POST") {
        if (conflict)
          return route.fulfill({
            status: 409,
            json: {
              error:
                "Conflito: outro operador alterou o objeto. Rascunho preservado.",
            },
          });
        publications++;
        published = published.map((s) => {
          const d = drafts.find((d) => d.sceneId === s.id);
          return d
            ? {
                ...s,
                title: d.content.title,
                payload: {
                  ...s.payload,
                  onlineEditor: {
                    version: 1,
                    revision: (s.payload.onlineEditor?.revision ?? 0) + 1,
                  },
                  layout: {
                    ...s.payload.layout!,
                    elements: d.content.elements,
                  },
                },
              }
            : s;
        });
        drafts = [];
        return route.fulfill({ json: { scenes: published } });
      }
      return route.fulfill({
        json: { scenes: published, drafts, versions: [] },
      });
    });
    await page.goto(origin + "/grupamento/monitor-editor/1");
    await expect(page.getByLabel("Nome da tela", { exact: true })).toHaveValue(
      "Revisão do abastecimento",
    );
    const object = (id: string) => page.locator(`[data-element-id="${id}"]`);
    await object("a").click();
    await expect(page.locator(".mcl-editor-handle")).toHaveCount(8);
    await object("b").click({ modifiers: ["Shift"] });
    await expect(page.locator(".mcl-editor-object.selected")).toHaveCount(2);
    await page.keyboard.press("Control+g");
    const before = await object("a").boundingBox();
    if (!before) throw new Error("No object");
    await page.mouse.move(before.x + 20, before.y + 15);
    await page.mouse.down();
    await page.mouse.move(before.x + 60, before.y + 30, { steps: 5 });
    await page.mouse.up();
    await expect(
      page.getByRole("button", { name: "Desfazer", exact: true }),
    ).toBeEnabled();
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");
    await page.keyboard.press("Control+Shift+g");
    await page.keyboard.press("Escape");
    await object("a").dblclick();
    await page
      .getByLabel("Editar texto no canvas")
      .fill("Intenção manual preservada");
    await page.keyboard.press("Escape");
    await object("a").click();
    await page.getByLabel("Esquerda %", { exact: true }).fill("22.2222222");
    await page.getByLabel("Topo %", { exact: true }).fill("25");
    await object("b").click();
    await page.getByLabel("Esquerda %", { exact: true }).fill("22.2222222");
    await page.getByLabel("Topo %", { exact: true }).fill("25");
    await page.getByLabel("Topo %", { exact: true }).blur();
    await page.keyboard.press("Control+s");
    await expect(page.getByRole("status")).toContainText("Rascunho salvo");
    expect(publications).toBe(0);
    expect(published[0].payload.layout!.elements[0].x).toBe(0.12);
    const saved = structuredClone(drafts[0].content.elements);
    await page.reload();
    await expect(page.getByRole("status")).toContainText("Rascunho salvo");
    await page
      .getByRole("button", { name: "Publicar alterações", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Publicado");
    expect(published[0].payload.layout!.elements).toEqual(saved);
    expect(publications).toBe(1);
    await page.reload();
    await expect(page.getByLabel("Nome da tela", { exact: true })).toHaveValue(
      "Revisão do abastecimento",
    );
    expect(prepareEditorScene(published[0]).payload.layout!.elements).toEqual(
      saved,
    );
    // Layer selection can reach intentionally overlapping objects.
    await page
      .getByRole("button", { name: "Intenção manual preservada", exact: true })
      .click();
    await page.keyboard.press("Control+d");
    expect(await page.locator(".mcl-editor-object").count()).toBe(4);
    await page.keyboard.press("Delete");
    expect(await page.locator(".mcl-editor-object").count()).toBe(3);
    await page.keyboard.press("Control+z");
    expect(await page.locator(".mcl-editor-object").count()).toBe(4);
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    expect(await page.locator(".mcl-editor-object").count()).toBe(5); // Restored selection supports ordinary copy/paste.
    await page
      .getByRole("button", { name: "Selecionar texto 5", exact: true })
      .click();
    const handle = page.getByRole("button", {
      name: "Redimensionar nw",
      exact: true,
    });
    const hb = await handle.boundingBox();
    if (!hb) throw new Error("No resize handle");
    await page.mouse.move(hb.x + 5, hb.y + 5);
    await page.mouse.down();
    await page.mouse.move(hb.x - 20, hb.y - 10, { steps: 4 });
    await page.mouse.up();
    await page
      .getByRole("button", { name: "Ampliar zoom", exact: true })
      .click();
    await expect(page.locator(".mcl-editor-footer")).toContainText("110%");
    await page.getByRole("button", { name: "Visualizar", exact: true }).click();
    await expect(page.locator(".mcl-editor-overlay")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Voltar à edição", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Rascunho salvo");
    conflict = true;
    await page
      .getByRole("button", { name: "Publicar alterações", exact: true })
      .click();
    await expect(page.locator(".mcl-editor-error")).toContainText("Conflito");
    expect(drafts.length).toBe(1);
    conflict=false;
    await page.getByTitle("Gráfico e tabela", {exact:true}).click();
    await object("chart").click();
    await page.getByLabel("Classe I", {exact:true}).fill("#ff0000");
    await page.getByLabel("Título do gráfico",{exact:true}).fill("Recursos por PI");
    await page.getByLabel("Legenda",{exact:true}).selectOption("none");
    await object("table").click();
    await page.getByLabel("Linha 1, coluna 1",{exact:true}).fill("Bandeiras");
    await page.getByRole("button",{name:"Adicionar linha",exact:true}).click();
    await expect(page.getByLabel("Linha 3, coluna 1",{exact:true})).toHaveValue("");
    await object("image").click();
    await page.getByLabel("Enquadramento",{exact:true}).selectOption("cover");
    const imageBox=await object("image").boundingBox();
    const imageHandle=await page.getByRole("button",{name:"Redimensionar se",exact:true}).boundingBox();
    await page.mouse.move(imageHandle!.x+5,imageHandle!.y+5);await page.mouse.down();await page.mouse.move(imageHandle!.x+45,imageHandle!.y+25,{steps:4});await page.mouse.up();
    const resizedImage=await object("image").boundingBox();expect(resizedImage!.width/resizedImage!.height).toBeCloseTo(imageBox!.width/imageBox!.height,1);
    await page.getByRole("button",{name:"Substituir imagem",exact:true}).click();
    await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=","base64")});
    await expect(page.locator(".mcl-editor-object")).toHaveCount(4);
    await page.getByRole("button",{name:"Forma",exact:true}).click();
    await page.getByLabel("Tipo de forma",{exact:true}).selectOption("arrow");
    await page.getByLabel("Rotação °",{exact:true}).fill("30");
    await page.getByLabel("Rotação °",{exact:true}).blur();
    await page.keyboard.press("Escape");await object("note").click();await page.keyboard.press("Control+a");
    await page.locator("summary").filter({hasText:/^Organizar$/}).click();
    await page.getByRole("button",{name:"Distribuir horizontalmente",exact:true}).click({force:true});
    await page.getByRole("button",{name:"Trazer para frente",exact:true}).click({force:true});
    await page.locator("summary").filter({hasText:/^Organizar$/}).click();
    await page.keyboard.press("Control+s");await expect(page.getByRole("status")).toContainText("Rascunho salvo");
    const mixed=drafts.find(d=>d.sceneId===published[1].id)!;
    const editedChart=mixed.content.elements.find(e=>e.kind==="chart");
    expect(editedChart?.kind==="chart"&&editedChart.chart.series[0].values).toEqual([42,63]);
    expect(editedChart?.kind==="chart"&&editedChart.chart.series[0].pointColors?.[0]).toBe("#ff0000");
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: output + "/editor-1366.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({
      path: output + "/editor-1920.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: output + "/editor-mobile.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
    console.log(
      JSON.stringify({
        result: "PASS",
        draftWrites,
        publications,
        checks: [
          "selection",
          "multiselect",
          "group",
          "ungroup",
          "drag",
          "eight handles",
          "resize nw",
          "undo",
          "redo",
          "inline text",
          "draft isolation",
          "reload",
          "publish",
          "exact overlap",
          "duplicate",
          "delete",
          "zoom",
          "preview",
          "conflict preservation",
          "responsive", "image replace", "image fit", "image aspect ratio", "chart styling/data invariant", "table editing", "shape/rotation", "distribution", "z-order",
        ],
        output,
      }),
    );
  } catch (error) {
    const page = browser.contexts()[0]?.pages()[0];
    if (page) {
      await page.screenshot({ path: output + "/failure.png", fullPage: true });
      console.log((await page.locator("body").innerText()).slice(-5000));
    }
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
