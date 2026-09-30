/** Local visual QA. All financial amounts below are TEST FIXTURES, never production data. */
import { chromium, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { parseSagWorkbook } from '../../src/modules/grupamento/sag';
import { parseRpnWorkbook } from '../../src/modules/grupamento/rpn';
import { buildCcoClassSummary, CCO_SUMMARY_ROWS_PER_PAGE, summaryClassId } from '../../src/modules/grupamento/class-summary';
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
let documentary:MonitorDocumentSceneDto[]=[];
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
  const count=Number(await page.locator('main').getAttribute('data-mcl-playlist-count'));const checks:Array<{overflows:unknown[];[key:string]:unknown}>=[];
  for(const mode of ['ccol','mcl','briefing'] as const) {
   if(mode !== 'ccol'){configs=configs.map(c=>c.id===9?{...c,layout:mode}:c);await page.reload();await expect(page.locator('[data-mcl-capture-ready="1"]')).toBeVisible();}
   for(const size of (mode==='ccol'?[{width:1366,height:768},{width:1535,height:863},{width:1920,height:1080}]:[{width:1366,height:768},{width:1920,height:1080}])){
   await page.setViewportSize(size);
   for(let i=0;i<count;i++){
    await page.evaluate(index=>window.postMessage({type:'MCL_CAPTURE_FRAME',frameIndex:index},location.origin),i);
    await expect(page.locator('main')).toHaveAttribute('data-mcl-frame-index',String(i));
    await expect(page.locator('[data-mcl-capture-ready="1"]')).toBeVisible();
    const info=await page.evaluate(()=>{
     const scene=document.querySelector<HTMLElement>('.mcl-budget-scene')!;const frame=scene.getBoundingClientRect();
     const overflows=Array.from(scene.querySelectorAll<HTMLElement>('.mcl-broadcast-card,.mcl-budget-unit,.mcl-class-summary-row,.mcl-class-summary-label,.mcl-class-summary-total')).filter(n=>n.scrollHeight>n.clientHeight+3||n.scrollWidth>n.clientWidth+3).map(n=>({text:n.innerText.slice(0,100),height:n.clientHeight,scroll:n.scrollHeight,width:n.clientWidth,scrollWidth:n.scrollWidth}));
     return {label:document.querySelector('main')!.getAttribute('data-mcl-frame-label'),frame:{height:frame.height,width:frame.width},overflows,scale:document.querySelector('[data-monitor-viewport]')!.getAttribute('data-scale'),pageCount:document.querySelector('[data-monitor-viewport]')!.getAttribute('data-page-count'),piCount:scene.querySelectorAll('.mcl-budget-pi').length,logos:scene.querySelectorAll('.mcl-om-identity img').length};
    });checks.push({mode,size,...info});
    expect(info.scale).toBe('1');expect(info.pageCount).toBe('1');expect(info.piCount).toBeLessThanOrEqual(20);
    if(info.label?.includes(' - Resumido')){
      const summaryId=summaryClassId(configs[8].screens.filter(s=>s.endsWith('-summary')).find(s=>info.label?.startsWith(CCO_SCREEN_CATALOG.find(d=>d.id===s)?.label??s))!);
      expect(summaryId).toBeDefined();
      const summary=buildCcoClassSummary(summaryId!,sag.rows);
      await expect(page.locator('.mcl-class-summary-total strong .mcl-animated-value > span:not([aria-hidden])')).toHaveText(summary.total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
      const pageIndex=Number(await page.locator('main').getAttribute('data-mcl-frame-label').then(label=>label?.match(/ · (\d+)\//)?.[1]??'1'))-1;
      const expected=summary.byPi.slice(pageIndex*CCO_SUMMARY_ROWS_PER_PAGE,(pageIndex+1)*CCO_SUMMARY_ROWS_PER_PAGE);
      await expect(page.locator('.mcl-class-summary-label > strong')).toHaveText(expected.map(item=>item.pi));
    }
    if(mode==='ccol' && size.width===1535 && (i<3||info.label?.includes('Classe I')||info.label?.includes('Resumo')||info.piCount===20||info.label?.includes('série 160 · 1/')))await page.screenshot({path:`${output}/${i}-${size.width}.png`});
   }
  }
  }
  await writeFile(output+'/report.json',JSON.stringify({checks,errors},null,2));
  const overflow=checks.filter(c=>c.overflows.length);console.log(JSON.stringify({frames:checks.length,overflow,errors},null,2));
  expect(errors).toEqual([]);expect(overflow).toEqual([]);
  documentary=[{id:'test-om-chart',monitorId:9,importId:'test-om-import',sceneOrder:0,sceneType:'CHART',title:'GRÁFICO · DADOS DE TESTE',sourceFileName:'FIXTURE_OM_TESTE.pptx',sourcePage:1,sourceImportedAt:'2026-09-30',sourceImportedByName:'OPERADOR DE TESTE',approvedAt:'2026-09-30',payload:{layoutVersion:2,layout:{version:2,width:12192000,height:6858000,elements:[{kind:'chart',x:.03,y:.05,w:.94,h:.9,z:1,chart:{type:'bar',orientation:'horizontal',legendPosition:'bottom',series:[{name:'SÉRIE DE TESTE',categories:['9 B Sup','9 BEC','9 BE Cmb'],values:[10,20,30]}]}}]}}}];
  configs=configs.map(c=>c.id===9?{...c,layout:'ccol',screens:[]}:c);
  await page.reload();await expect(page.locator('[data-mcl-capture-ready="1"]')).toBeVisible();
  await expect(page.locator('svg image')).toHaveCount(3);await page.screenshot({path:output+'/om-chart.png'});
  await context.route('**/api/grupamento/monitor-content?*',r=>r.fulfill({json:{imports:[]}}));
  const command=await context.newPage();await command.goto(origin+'/grupamento');
  await command.locator('summary').filter({hasText:'Conteúdo orçamentário do SAG'}).nth(8).click();
  await command.getByRole('button',{name:'Classe I - Resumido',exact:true}).nth(8).hover();
  await expect(command.getByRole('tooltip')).toContainText('Visualização do total de recursos recebidos desta classe distribuído por PI');
  await command.getByRole('button',{name:'Classe I - Resumido',exact:true}).nth(8).focus();
  await command.keyboard.press('Escape');
  await expect(command.getByRole('tooltip')).toHaveCount(0);

  await expect(command.getByRole('button',{name:'Exportar para corrigir'}).nth(8)).toBeEnabled();
  const download=command.waitForEvent('download');await command.getByRole('button',{name:'Exportar para corrigir'}).nth(8).click();
  await (await download).saveAs(output+'/FIXTURE-OM-correction.pptx');
  console.log('PASS: OM categories and correction PPT download with official emblems.');
  expect(errors).toEqual([]);
  expect(await page.evaluate(async()=>{const c=await caches.open('mcl-monitor-assets-v4');return (await c.keys()).filter(r=>new URL(r.url).pathname.startsWith('/om-crests/')).length;})).toBe(54);
 }finally{await browser?.close();server.kill();}
}
verify().catch(e=>{console.error(e);process.exit(1)});
