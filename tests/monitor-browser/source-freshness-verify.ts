/** Local UI fixtures only, no production data access. */
import { chromium, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import * as XLSX from "xlsx";
import { parseSagWorkbook } from "../../src/modules/grupamento/sag";
import { buildRpnImportResult } from "../../src/modules/grupamento/rpn";
import { defaultCcoMonitorConfig } from "../../src/modules/grupamento/monitor";
const origin = "http://127.0.0.1:3010", now = "2026-10-01T14:00:00Z";
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([["UG","NOME_UG","PI","NOME_PI","DISPONIVEL","A_LIQUIDAR","EM_LIQUIDACAO","LIQUIDADO","PAGO"],["160136","9 Gpt Log","TESTE","TESTE",100,20,0,30,30]]),"TESTE");
const current = parseSagWorkbook(new Uint8Array(XLSX.write(book,{type:"buffer",bookType:"xlsx"})).buffer,"SAG-EC-TESTE.xlsx");
current.source.referenceDate = "2026-10-01"; current.source.importedAt = now;
const rpn = buildRpnImportResult([],"SAG-RPNP-TESTE.pdf",[],[],"2026-09-24"); rpn.source.importedAt = now;
let includeRpn = true;
async function verify() {
  const browser = await chromium.launch({executablePath:process.env.MONITOR_CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
    await page.clock.setFixedTime(new Date(now));
    const token = await encode({secret:"local-monitor-regression-test-secret-20260925",token:{sub:"test-only",name:"Operador de teste",roles:["ADMIN"],organizationId:"fixture-org"}});
    await page.context().addCookies([{name:"next-auth.session-token",value:token,url:origin},{name:"mcl_onboarding_completed",value:"true",url:origin}]);
    const configs = defaultCcoMonitorConfig().map(config => ({...config,updatedByName:"ST Luiz Henrique",updatedAt:now}));
    await page.route("**/api/grupamento/**",route => route.fulfill({json:route.request().url().includes("/sag/latest") ? {current,rpn:includeRpn ? rpn : null} : route.request().url().endsWith("/monitors") ? {monitors:configs} : {imports:[],devices:[]}}));
    await page.goto(origin+"/grupamento");
    const sources = page.getByRole("button",{name:"2/2 fontes ativas: ver explicação",exact:true});
    await expect(sources).toHaveAttribute("data-source-freshness","7"); await expect(sources).toContainText("Há 7 dias");
    const red = await sources.evaluate(node => getComputedStyle(node).borderColor);
    await sources.hover();
    const popup = page.locator('[popover=auto]:popover-open');
    await expect(popup.locator('[data-sag-source-age="0"]')).toContainText("Exercício corrente");
    await expect(popup.locator('[data-sag-source-age="7"]')).toContainText("24/09/2026");
    await expect(popup).toContainText("Referência do relatório");
    await page.screenshot({path:"/workspace/scratch/55a592607734/sag-source-freshness.png"});
    await page.mouse.move(0,0);
    await page.getByRole("button",{name:"10 monitores: ver placar de atualizações",exact:true}).click();
    await expect(popup.locator("li").first()).toContainText("ST Luiz Henrique"); await page.keyboard.press("Escape");
    rpn.source.referenceDate = "2026-10-01";
    await page.reload(); await expect(sources).toHaveAttribute("data-source-freshness","0"); await expect(sources).toContainText("Dados de hoje");
    expect(await sources.evaluate(node => getComputedStyle(node).borderColor)).not.toBe(red);
    await page.setViewportSize({width:390,height:844}); await sources.scrollIntoViewIfNeeded(); await sources.hover(); await expect(popup).toBeVisible(); await page.waitForTimeout(500);
    const bounds = await popup.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(844);
    await expect.poll(() => popup.evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x+40,rect.y+40)); })).toBe(true);
    await page.screenshot({path:"/workspace/scratch/55a592607734/sag-source-freshness-mobile.png"});
    includeRpn = false; await page.mouse.move(0,0); await page.reload();
    const partial = page.getByRole("button",{name:"1/2 fontes ativas: ver explicação",exact:true}); await expect(partial).toHaveAttribute("data-source-freshness","unknown"); await expect(partial).toContainText("Carga incompleta");
    console.log("PASS: SAG pair uses oldest reference, per-source dates and colors, today green, incomplete gray, entered uploader shown and source popup fits desktop/mobile.");
  } finally { await browser.close(); }
}
verify().catch(error => {console.error(error);process.exit(1);});
