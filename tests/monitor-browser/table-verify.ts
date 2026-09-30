/** Isolated visual regression. Fixtures reproduce data shapes only; no production writes. */
import { chromium, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { defaultCcoMonitorConfig } from '../../src/modules/grupamento/monitor';
import type { MonitorDocumentSceneDto } from '../../src/modules/grupamento/monitor-content/types';
const origin = 'http://127.0.0.1:3011';
const secret = 'local-table-fit-test-only';
const columns = ['Plano Interno', 'Descrição', 'Disponível', 'A liquidar', 'Em liquidação', 'Liquidado', 'Pago', 'Percentual empenhado', 'Percentual liquidado'];
const rows = [
 ['E6RVPLJMTOC','MEDIDAS PROFILÁTICAS SAÚDE CANINOS','R$ 455,00','R$ 1.673,19','R$ 1.241,84','R$ 314,86','R$ 30.687,87','98.68%','90.20%'],
 ['E6RVPLJMTOE','MEDIDAS PROFILÁTICAS SAÚDE EQUINOS','R$ 3.529,24','R$ 11.801,06','R$ 0,00','R$ 7,99','R$ 67.703,01','95.75%','81.54%'],
 ['E6RVPLJOUT4','OUTROS - planejado','R$ 4,50','R$ 19.995,50','R$ 0,00','R$ 0,00','R$ 66.615,94','99.99%','76.91%'],
 ['E6RVSOLOUT4','OUTROS - solicitado','R$ 10.601,54','R$ 249.145,94','R$ 0,00','R$ 322,46','R$ 128.700,89','97.27%','33.19%'],
];
const cases: Array<{name:string;columns:string[];rows:string[][];variant?:'legacy'|'mixed'}> = [
 {name:'veterinary',columns,rows},
 {name:'dense',columns,rows:Array.from({length:37},(_,i)=>[`${rows[i%4][0]}_${i}`,...rows[i%4].slice(1)])},
 {name:'large-amounts',columns,rows:rows.map(r=>r.map((v,i)=>i>=2&&i<=6?'R$ 12.345.678,90':v))},
 {name:'simple',columns:['OM','Descrição','Pago'],rows:[['9º B Sup','Descritivo completo sem corte de conteúdo','R$ 1.234.567,89'],['9º BEC','Outro texto de origem integral','R$ 0,00']]},
 {name:'empty',columns,rows:[]},
 {name:'legacy',columns,rows,variant:'legacy'},
 {name:'mixed',columns,rows,variant:'mixed'},
];
let fixture=cases[0];
let twoScenes=false;
let configs=defaultCcoMonitorConfig().map(c=>c.id===7?{...c,screens:[],layout:'mcl' as const,delaySeconds:5}:c);
const scene = ():MonitorDocumentSceneDto => ({id:`fixture-${fixture.name}-${configs[6].layout}`,monitorId:7,importId:'fixture',sceneOrder:0,sceneType:'TABLE',title:`TESTE LOCAL · ${fixture.name} · ${configs[6].layout}`,sourceFileName:'FIXTURE_TABLE_TESTE.pptx',sourcePage:4,sourceImportedAt:'2026-09-30',sourceImportedByName:'OPERADOR DE TESTE',approvedAt:'2026-09-30',payload:fixture.variant==='legacy'?{columns:fixture.columns,rows:fixture.rows,bullets:['Nota da fonte preservada integralmente.']}:{layoutVersion:2,layout:{version:2,width:12192000,height:6858000,elements:[
 {kind:'text',text:'TESTE LOCAL · REMONTA E VETERINÁRIA',role:'title',x:.03,y:.02,w:.94,h:.1,z:1},
 {kind:'table',columns:fixture.columns,rows:fixture.rows,x:.03,y:.2,w:fixture.variant==='mixed'?.68:.94,h:fixture.variant==='mixed'?.64:.42,z:2},
 ...(fixture.variant==='mixed'?[{kind:'chart' as const,x:.74,y:.2,w:.23,h:.6,z:4,chart:{type:'pie' as const,series:[{name:'SÉRIE DE TESTE',categories:['A','B'],values:[10,20]}]}}]:[]),
 {kind:'text',text:'Nota da fonte preservada integralmente.',x:.03,y:.9,w:.94,h:.06,z:3},
]}}});
async function verify(){
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3011'],{env:{...process.env,AUTH_SECRET:secret,NEXTAUTH_SECRET:secret,NEXTAUTH_URL:origin},stdio:['ignore','pipe','pipe']});
 let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 let browser;
 try {
  for(let i=0;i<100;i++){try{if((await fetch(origin+'/entrar')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));if(i===99)throw new Error(log);}
  const executablePath=process.env.MONITOR_CHROMIUM_PATH??(await readFile('/tmp/mcl-chromium-path','utf8')).trim();
  browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const context=await browser.newContext({viewport:{width:1280,height:1024},reducedMotion:'reduce',serviceWorkers:'block'});
  const token=await encode({secret,token:{sub:'test-only',roles:['ADMIN'],organizationId:'fixture-org'}});
  await context.addCookies([{name:'next-auth.session-token',value:token,url:origin},{name:'mcl_onboarding_completed',value:'true',url:origin}]);
  await context.route('**/api/grupamento/sag/latest*',r=>r.fulfill({json:{current:null,rpn:null}}));
  await context.route('**/api/grupamento/monitors*',r=>r.fulfill({json:{monitors:configs}}));
  await context.route('**/api/grupamento/monitor-content/playlist?*',r=>r.fulfill({json:{scenes:twoScenes?[scene(),{...scene(),id:'next-fixture',title:'PRÓXIMO QUADRO DE TESTE'}]:[scene()]}}));
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const output='/tmp/mcl-table-qa';await mkdir(output,{recursive:true});const checks:unknown[]=[];
  if(process.env.MONITOR_LIVE_ONLY !== '1') for(const mode of (process.env.MONITOR_MIXED_ONLY==='1'?['briefing'] as const:['mcl','ccol','briefing'] as const)){
   configs=configs.map(c=>c.id===7?{...c,layout:mode}:c);
   for(const example of (process.env.MONITOR_MIXED_ONLY==='1'?cases.filter(c=>c.variant==='mixed'):cases)){if(page.url().startsWith(origin))await page.evaluate(async()=>{await caches.delete('mcl-monitor-snapshots-v4');});fixture=example;await page.goto(origin+'/grupamento/monitor-capture/7');
    await expect(page.locator('[data-mcl-capture-root]')).toHaveAttribute('data-mcl-frame-label',scene().title);await expect(page.locator('[data-table-display]')).toBeVisible();
    for(const size of [{width:1024,height:768},{width:1280,height:1024},{width:1366,height:768},{width:1920,height:1080},{width:1280,height:720}]){
     await page.setViewportSize(size);await page.waitForTimeout(400);await expect(page.locator('[data-monitor-document-table]')).toHaveAttribute('data-table-ready','1');
     const table=page.locator('[data-monitor-document-table]');const count=Number(await table.getAttribute('data-capture-page-count'));const seen:number[]=[];
     for(let p=0;p<count;p++){
      await page.evaluate(page=>window.postMessage({type:'MCL_CAPTURE_TABLE_PAGE',page},location.origin),p);
      await expect(table).toHaveAttribute('data-capture-page',String(p));
      const result=await page.locator('[data-table-display]').evaluate(node=>{
       const frame=node.parentElement!.getBoundingClientRect();
       const cells=Array.from(node.querySelectorAll<HTMLElement>('td,dd'));
       const spills=cells.filter(cell=>{const r=cell.getBoundingClientRect();return cell.scrollWidth>cell.clientWidth+2||r.bottom>frame.bottom-20+2||r.right>frame.right+2;}).map(cell=>({text:cell.textContent,width:cell.clientWidth,scroll:cell.scrollWidth,bottom:cell.getBoundingClientRect().bottom,frameBottom:frame.bottom}));
       const rows=Array.from(node.querySelectorAll<HTMLElement>('[data-source-row]')).map(row=>({index:Number(row.dataset.sourceRow),values:Array.from(row.querySelectorAll<HTMLElement>('td,dd')).sort((a,b)=>Number(a.dataset.sourceColumn)-Number(b.dataset.sourceColumn)).map(cell=>cell.textContent)}));
       return {spills,rows,displayHeight:node.getBoundingClientRect().height,frameHeight:frame.height,
        probeHead:node.parentElement!.querySelector('[aria-hidden] thead')?.getBoundingClientRect().height,
        visibleHead:node.querySelector('thead')?.getBoundingClientRect().height,
        rowHeights:Array.from(node.querySelectorAll<HTMLElement>('[data-table-row-group]')).map(row=>({height:row.getBoundingClientRect().height,style:row.getAttribute('style')}))};
      });
      checks.push({mode,fixture:fixture.name,size,page:p,font:await table.getAttribute('data-table-font'),presentation:await table.getAttribute('data-table-mode'),pageCount:count,...result});
      await writeFile(output+'/report.json',JSON.stringify({checks,errors},null,2));expect(result.spills,JSON.stringify(checks.at(-1))).toEqual([]);
      result.rows.forEach(row=>{seen.push(row.index);expect(row.values).toEqual(fixture.rows[row.index]);});
     }
     expect(seen,JSON.stringify({mode,fixture:fixture.name,size,count,checks:checks.slice(-count)})).toEqual(fixture.rows.map((_,i)=>i));
     await expect(page.getByText('Nota da fonte preservada integralmente.')).toBeVisible();
     if(example.name==='veterinary'&&mode==='mcl'){await page.evaluate(()=>window.postMessage({type:'MCL_CAPTURE_TABLE_PAGE',page:0},location.origin));await expect(table).toHaveAttribute('data-capture-page','0');await page.screenshot({path:`${output}/${mode}-${size.width}-${size.height}.png`});}
    }
   }
  }
  fixture=cases[0];twoScenes=true;configs=configs.map(c=>c.id===7?{...c,layout:'mcl',mode:'loop'}:c);
  await page.evaluate(async()=>{await caches.delete('mcl-monitor-snapshots-v4');});
  await page.setViewportSize({width:1280,height:720});await page.goto(origin+'/grupamento/monitor/7');
  await expect(page.locator('[data-mcl-capture-root]')).toHaveAttribute('data-mcl-frame-label',scene().title);
  const liveTable=page.locator('[data-monitor-document-table]');await expect(liveTable).toHaveAttribute('data-table-ready','1');
  const livePages=Number(await liveTable.getAttribute('data-capture-page-count'));expect(livePages).toBeGreaterThan(1);
  for(let p=1;p<livePages;p++){await expect(liveTable).toHaveAttribute('data-capture-page',String(p),{timeout:7000});await expect(page.locator('[data-mcl-capture-root]')).toHaveAttribute('data-mcl-frame-label',scene().title);}
  await expect(page.locator('[data-mcl-capture-root]')).toHaveAttribute('data-mcl-frame-label','PRÓXIMO QUADRO DE TESTE',{timeout:7000});
  console.log('PASS: automatic playback displays every table page before advancing.');
  expect(errors).toEqual([]);await writeFile(output+(checks.length?'/report.json':'/live-report.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({frames:checks.length,errors,fixtures:cases.length,modes:3,resolutions:5}));
 }finally{await browser?.close();server.kill();}
}
verify().catch(e=>{console.error(e);process.exit(1)});
