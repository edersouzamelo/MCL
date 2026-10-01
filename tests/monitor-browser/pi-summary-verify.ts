/** Local visual QA. All financial amounts below are TEST FIXTURES, never production data. */
import { chromium, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { parseSagWorkbook } from '../../src/modules/grupamento/sag';
import { parseRpnWorkbook } from '../../src/modules/grupamento/rpn';
import { buildCcoClassSummary, paginateClassSummary, summaryClassId } from '../../src/modules/grupamento/class-summary';
import { CCO_CLASS_GROUPS } from '../../src/modules/grupamento/cco';
import { defaultCcoMonitorConfig, CCO_SCREEN_CATALOG } from '../../src/modules/grupamento/monitor';
import type { MonitorDocumentSceneDto } from '../../src/modules/grupamento/monitor-content/types';
import { OM_CREST_CATALOG } from '../../src/modules/grupamento/om-crests';
const origin = 'http://127.0.0.1:3010';
const secret = 'local-budget-layout-test-only';
function workbook(headers: string[], rows: unknown[][]) {
  const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet([headers,...rows]),'DADOS DE TESTE');
  return new Uint8Array(XLSX.write(b,{type:'buffer',bookType:'xlsx'})).buffer;
}
const codes = [...new Set(CCO_CLASS_GROUPS.flatMap(g=>g.piCodes)), ...Array.from({length:21},(_,i)=>`TESTE_PI_${i}`)];
const input=codes.map((pi,i)=>[String((i%30<25?160000:167000)+(i%30)),OM_CREST_CATALOG.units[i%30].acronym,pi,'DESCRIÇÃO DE TESTE PARA O PLANO INTERNO',100000,200000,300000,400000,500000]);
const sag=parseSagWorkbook(workbook(['UG','NOME_UG','PI','NOME_PI','DISPONIVEL','A_LIQUIDAR','EM_LIQUIDACAO','LIQUIDADO','PAGO'],input),'FIXTURE_SAG_TESTE.xlsx');
const rpn=parseRpnWorkbook(workbook(['UG','NOME_UG','PI','NOME_PI','TOTAL_INSCRITO','TOTAL_A_LIQUIDAR','TOTAL_LIQUIDADO','CANC'],input.map(r=>[...r.slice(0,4),1100000,250000,750000,100000])),'FIXTURE_RPN_TESTE.xlsx');
const documentary:MonitorDocumentSceneDto[]=[];
let configs=defaultCcoMonitorConfig().map(c=>c.id===9?{...c,label:'MONITOR · DADOS DE TESTE',layout:'ccol' as const,screens:CCO_SCREEN_CATALOG.map(s=>s.id)}:c);
async function verify(){
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3010'],{env:{...process.env,AUTH_SECRET:secret,NEXTAUTH_SECRET:secret,NEXTAUTH_URL:origin},stdio:['ignore','pipe','pipe']});
 let serverLog=''; server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
 let browser;
 try {
  for(let i=0;i<80;i++){try{if((await fetch(origin+'/entrar')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));if(i===79)throw new Error(serverLog);}
  browser=await chromium.launch({executablePath:process.env.MONITOR_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const context=await browser.newContext({viewport:{width:1535,height:863},reducedMotion:'reduce'});
  const token=await encode({secret,token:{sub:'test-only',roles:['ADMIN'],organizationId:'fixture-org'}});
  await context.addCookies([{name:'next-auth.session-token',value:token,url:origin},{name:'mcl_onboarding_completed',value:'true',url:origin}]);
  await context.route('**/api/grupamento/sag/latest*',r=>r.fulfill({json:{current:sag,rpn}}));
  await context.route('**/api/grupamento/monitors*',r=>r.fulfill({json:{monitors:configs}}));
  await context.route('**/api/grupamento/monitor-content/playlist?*',r=>r.fulfill({json:{scenes:documentary}}));
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const output='/tmp/mcl-budget-qa';await mkdir(output,{recursive:true});
  await page.goto(origin+'/grupamento/monitor-capture/9');

  await expect(page.locator('[data-mcl-capture-ready="1"]')).toBeVisible();

  for (const mode of ['mcl','ccol','briefing'] as const) {
    configs=configs.map(c=>c.id===9?{...c,layout:mode,screens:['class-ii-summary' as const]}:c);
    for (const count of [9,10,12]) {
      const allowed = new Set(CCO_CLASS_GROUPS.filter(g=>g.classId==='class-ii').flatMap(g=>g.piCodes).slice(0,count));
      const testSag={...sag,rows:sag.rows.filter(r=>allowed.has(r.pi!))};
      await context.unroute('**/api/grupamento/sag/latest*');
      await context.route('**/api/grupamento/sag/latest*',r=>r.fulfill({json:{current:testSag,rpn}}));
      for (const size of [{width:1366,height:768},{width:1535,height:863},{width:1920,height:1080}]) {
        await page.setViewportSize(size); await page.reload();
        await expect(page.locator('[data-mcl-capture-ready="1"]')).toBeVisible();
        const pages=paginateClassSummary(buildCcoClassSummary('class-ii',testSag.rows).byPi);
        await expect(page.locator('main')).toHaveAttribute('data-mcl-playlist-count',String(pages.length));
        for (let i=0;i<pages.length;i++) {
          await page.evaluate(index=>window.postMessage({type:'MCL_CAPTURE_FRAME',frameIndex:index},location.origin),i);
          await expect(page.locator('main')).toHaveAttribute('data-mcl-frame-index',String(i));
          await expect(page.locator('[data-mcl-capture-ready="1"]')).toBeVisible();
          await expect(page.locator('.mcl-class-summary-identity > strong')).toHaveText(pages[i].map(r=>r.pi));
          await expect(page.locator('.mcl-standard-title-box')).toContainText('Provisão orçamentária resumida por PI');
          await expect(page.locator('.mcl-class-summary-identity > span')).toHaveText(pages[i].map(()=> ' · DESCRIÇÃO DE TESTE PARA O PLANO INTERNO'));
          const overflow=await page.locator('.mcl-class-summary-row,.mcl-class-summary-label,.mcl-class-summary-total').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+3||n.scrollWidth>n.clientWidth+3).map(n=>n.textContent));
          expect(overflow).toEqual([]);
        }
      }
    }
  }
  expect(errors).toEqual([]);
  console.log('PASS: nine PI in one screen; balanced larger lists; full PI descriptions and title; three layouts and three resolutions.');
 }finally{await browser?.close();server.kill();}
}
verify().catch(e=>{console.error(e);process.exit(1)});
