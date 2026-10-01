/** Local fixtures only. No production reads or writes. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { mkdir, readFile } from "node:fs/promises";
import { defaultCcoMonitorConfig } from "../../src/modules/grupamento/monitor";
import { composeTextDocument, plainTextBlocks } from "../../src/modules/grupamento/monitor-content/text-document";
import type { MonitorDocumentSceneDto } from "../../src/modules/grupamento/monitor-content/types";
import { extractPptxLayout } from "../../src/modules/grupamento/monitor-content/pptx-layout";
import { monitorTextSlide } from "../../src/modules/grupamento/monitor-content/text-slide";
const origin = "http://127.0.0.1:3010", secret = "local-monitor-regression-test-secret-20260925";
const routeText = "ROTAS / PARADAS: Campo Grande, Coxim (47º BI), Rondonópolis (18º GAC), Cuiabá (44º BI Mtz), Cáceres (66º BI Mtz), Aragarças (58º BI Mtz), retorno a Campo Grande.";
const paragraphs = [routeText, ...Array.from({length:12},(_,i) => `Registro ${i+1}: Carga confirmada de ${i+1} toneladas. A viatura percorreu a rota completa e entregou os materiais relacionados, preservando o registro de todas as organizações apoiadas. `.repeat(2).trim())];
const drafts = composeTextDocument(plainTextBlocks(["MISSÃO EM PLANEJAMENTO",...paragraphs,"RESULTADOS", "Nr MISSÕES: 60", "Qnt Vtr EMPREGADAS: 174", "KM PERCORRIDOS: 168.259", "SUPRIMENTO TRANSPORTADO: 1.280 toneladas"].join("\n\n")));
const textScenes: MonitorDocumentSceneDto[] = drafts.map((scene,index) => ({...scene,id:`text-${index}`,importId:"fixture-text",monitorId:8,sceneOrder:index,sourcePage:scene.sourcePage ?? null,sourceFileName:"MISSOES_TESTE.docx",sourceImportedAt:"2026-10-01",sourceImportedByName:"Operador de teste",approvedAt:"2026-10-01"}));
let scenes: MonitorDocumentSceneDto[] = [];
let configs = defaultCcoMonitorConfig().map(m => m.id === 8 ? {...m,layout:"mcl" as const,screens:[],delaySeconds:5} : m);
async function verify() {
  const browser = await chromium.launch({executablePath:process.env.MONITOR_CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
  try {
    const context = await browser.newContext({viewport:{width:1366,height:768},reducedMotion:"reduce",serviceWorkers:"block"});
    const token = await encode({secret,token:{sub:"test-only",roles:["ADMIN"],organizationId:"fixture-org"}});
    await context.addCookies([{name:"next-auth.session-token",value:token,url:origin},{name:"mcl_onboarding_completed",value:"true",url:origin}]);
    await context.route("**/api/grupamento/**",r => r.fulfill({json:{imports:[],devices:[]}}));
    await context.route("**/api/grupamento/sag/latest*",r => r.fulfill({json:{current:null,rpn:null}}));
    await context.route("**/api/grupamento/monitors*",r => r.fulfill({json:{monitors:configs}}));
    await context.route("**/api/grupamento/monitor-content/playlist?*",r => r.fulfill({json:{scenes}}));
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror",error => errors.push(error.message));
    const output = "/workspace/scratch/55a592607734/text-document-qa";
    await mkdir(output,{recursive:true});
    await page.goto(origin+"/grupamento/monitor/8");
    await expect(page.locator("[data-monitor-standby]")).toBeVisible();
    await expect(page.getByText("Sem conteúdo selecionado")).toHaveCount(0);
    const logo = await page.locator('[data-monitor-standby] img[alt="MCL"]').boundingBox(); expect(logo?.width).toBeGreaterThan(200);
    await page.screenshot({path:output+"/standby.png"});
    scenes = textScenes;
    for (const mode of ["mcl","ccol","briefing"] as const) {
      configs = configs.map(m => m.id === 8 ? {...m,layout:mode} : m);
      for (const size of [{width:1366,height:768},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}]) {
        await page.setViewportSize(size);
        await page.evaluate(async () => {for(const name of await caches.keys()) if(name.includes("snapshots")) await caches.delete(name);});
        await page.goto(origin+"/grupamento/monitor-capture/8");
        for (let index=0;index<scenes.length;index++) {
          await page.evaluate(index => window.postMessage({type:"MCL_CAPTURE_FRAME",frameIndex:index},location.origin),index);
          await expect(page.locator("[data-mcl-capture-root]")).toHaveAttribute("data-mcl-frame-index",String(index));
          const text = page.locator("[data-monitor-document-text]"); await expect(text).toHaveAttribute("data-text-ready","1");
          const count = Number(await text.getAttribute("data-capture-page-count")), seen: string[] = [];
          for (let part=0;part<count;part++) {
            await page.evaluate(part => window.postMessage({type:"MCL_CAPTURE_TEXT_PAGE",page:part},location.origin),part);
            await expect(text).toHaveAttribute("data-capture-page",String(part));
            const result = await page.locator("[data-text-display]").evaluate(node => {
              const frame = node.getBoundingClientRect();
              const cards = Array.from(node.querySelectorAll<HTMLElement>("[data-text-paragraph]"));
              return {texts:cards.map(card => card.textContent!),spills:cards.filter(card => card.scrollWidth > card.clientWidth+1 || card.scrollHeight > card.clientHeight+1 || card.getBoundingClientRect().bottom > frame.bottom+1).map(card => ({text:card.textContent,height:card.clientHeight,scroll:card.scrollHeight,bottom:card.getBoundingClientRect().bottom,limit:frame.bottom}))};
            });
            expect(result.spills,JSON.stringify({mode,size,index,part,result})).toEqual([]); seen.push(...result.texts);
          }
          expect(seen.join(" ")).toBe((scenes[index].payload.bullets ?? []).join(" "));
          expect(await text.locator('[data-text-display] img[alt^="Escudo"]').count()).toBe(0);
          if (index===0 && size.width===1366) await page.screenshot({path:`${output}/text-${mode}.png`});
        }
      }
    }
    // Optional real-source regression, kept outside the public repository.
    // Exercise published legacy PPT payloads without requiring another upload.
    if (process.env.MONITOR_TEXT_PPT_FIXTURE) {
      const original = extractPptxLayout(await readFile(process.env.MONITOR_TEXT_PPT_FIXTURE));
      const reports = original.scenes.filter(scene => monitorTextSlide(scene.payload,scene.title));
      expect(reports.length).toBeGreaterThan(0);
      for (const mode of ["mcl","ccol","briefing"] as const) {
        configs = configs.map(m => m.id === 8 ? {...m,layout:mode} : m);
        for (const size of [{width:1366,height:768},{width:1920,height:1080},{width:390,height:844}]) {
          await page.setViewportSize(size);
          for (const [index,report] of reports.entries()) {
            scenes = [{...textScenes[0],...report,id:`real-report-${index}`,sourceFileName:"source.pptx",sourcePage:report.sourcePage ?? null}];
            await page.evaluate(async () => {for(const name of await caches.keys()) if(name.includes("snapshots")) await caches.delete(name);});
            await page.goto(origin+"/grupamento/monitor-capture/8");
            const text = page.locator("[data-monitor-document-text]");
            await expect(text).toHaveAttribute("data-text-ready","1");
            const count = Number(await text.getAttribute("data-capture-page-count")), seen: string[] = [];
            for (let part=0;part<count;part++) {
              await page.evaluate(part => window.postMessage({type:"MCL_CAPTURE_TEXT_PAGE",page:part},location.origin),part);
              await expect(text).toHaveAttribute("data-capture-page",String(part));
              const cards = page.locator("[data-text-display] [data-text-paragraph]");
              seen.push(...await cards.allTextContents());
              expect(await cards.evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight+1 && node.scrollWidth <= node.clientWidth+1))).toBe(true);
              await expect(text.locator('[data-text-display] img[alt^="Escudo"]')).toHaveCount(0);
            }
            expect(seen.join(" ")).toBe(monitorTextSlide(report.payload,report.title)!.paragraphs.join(" "));
            if (mode === "mcl" && size.width === 1366 && index === 1) {
              await page.evaluate(() => window.postMessage({type:"MCL_CAPTURE_TEXT_PAGE",page:0},location.origin));
              await expect(text).toHaveAttribute("data-capture-page","0");
              await page.screenshot({path:output+"/transport-real-source.png"});
            }
          }
        }
      }
    }
    // The reported route issue came from PPTX. Only prose changes; OM cells and
    // chart categories still decorate, and the source slide is not re-extracted.
    scenes = [{...textScenes[0],id:"ppt-route",title:"MISSÃO EM PLANEJAMENTO",sourceFileName:"MISSOES.pptx",payload:{layoutVersion:2,layout:{version:2,width:12192000,height:6858000,elements:[
      {kind:"text",text:"MISSÃO EM PLANEJAMENTO",role:"title",x:.03,y:.02,w:.94,h:.12,z:0},
      {kind:"text",text:routeText,x:.03,y:.18,w:.94,h:.25,z:1,fontSizePt:24},
      {kind:"table",columns:["OM","Carga"],rows:[["9º B Sup","20 toneladas"]],x:.03,y:.5,w:.43,h:.35,z:2},
      {kind:"chart",x:.53,y:.5,w:.44,h:.35,z:3,chart:{type:"bar",series:[{name:"Carga",categories:["44º BI Mtz"],values:[20]}]}},
    ]}}}];
    configs = configs.map(m => m.id === 8 ? {...m,layout:"mcl"} : m);
    await page.setViewportSize({width:1366,height:768});
    await page.evaluate(async () => {for(const name of await caches.keys()) if(name.includes("snapshots")) await caches.delete(name);});
    await page.goto(origin+"/grupamento/monitor-capture/8");
    await expect(page.getByText(routeText,{exact:true})).toBeVisible();
    await expect(page.getByText(routeText,{exact:true}).locator("img")).toHaveCount(0);
    await expect(page.locator('[data-table-display] img[alt="Escudo 9º B Sup"]')).toBeVisible();
    await expect(page.locator('svg image[aria-label="44º BI Mtz"]')).toBeVisible();
    await page.screenshot({path:output+"/ppt-route.png"});
    scenes = [{...textScenes[0],payload:{...textScenes[0].payload,bullets:paragraphs}}];
    await page.goto(origin+"/grupamento");
    await page.getByRole("button",{name:"Configurar Monitor 8",exact:true}).click();
    const downloadPromise = page.waitForEvent("download",{timeout:60000});
    await page.locator("dialog[open]").getByRole("button",{name:"Exportar (extrair HTML)",exact:true}).click();
    const download = await downloadPromise;
    const html = await readFile((await download.path())!,"utf8");
    const frames: Array<{html:string;label:string}> = JSON.parse(html.match(/const frames=(.*);\nconst delay=/)![1]);
    expect(frames.length).toBeGreaterThan(1);
    const offline = await context.newPage();
    await offline.setContent(html);
    await offline.getByRole("button",{name:"Pausar apresentação",exact:true}).click();
    const seen: string[] = [];
    for (let index=0;index<frames.length;index++) {
      if(index) await offline.getByRole("button",{name:"Avançar quadro",exact:true}).click();
      await expect(offline.locator("#stage")).toHaveAttribute("aria-label",frames[index].label);
      seen.push(...await offline.locator("[data-text-display] [data-text-paragraph]").allTextContents());
    }
    expect(seen.join(" ")).toBe(paragraphs.join(" "));
    await offline.close();
    expect(errors).toEqual([]);
    console.log("PASS: waiting logo, all text preserved across pages, readable fit in 3 layouts and 4 resolutions, prose routes without emblems, PPT table/chart emblems intact, actual offline export includes every text page, no browser errors.");
  } finally { await browser.close(); }
}
verify().catch(error => {console.error(error);process.exit(1);});
