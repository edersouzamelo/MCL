import { describe,expect,it } from "vitest";
import type { TgRow } from "@/modules/credits-tg/parser";
import { extractNcDeadlines,queryNcDeadlines,localReferenceDay } from "@/modules/ai/nc-deadlines";

describe("prazos documentais de NC",()=>{
  it.each([
    ["EMPH ATE 30OUT26.","2026-10-30",false],
    ["PRAZO PARA EMPENHO: 16/09/2026.","2026-09-16",false],
    ["EMPENHO ATE 2MAIO26.","2026-05-02",false],
    ["EMPH IMPRETERIVELMENTE ATE 30AGO26.","2026-08-30",false],
    ["EMPH ATE 31 OUT.","2026-10-31",true],
    ["EMPH ATE 30/04/2025.","2025-04-30",false],
  ])("extrai prazo e prova textual sem confundir emissão: %s",(text,date,inferred)=>{
    expect(extractNcDeadlines(text,"160504000012026NC000001")[0]).toMatchObject({kind:"EMPENHO",date,yearInferredFromNc:inferred,evidence:text.replace(/\.$/,"")});
  });
  it("distingue prazo para empenho e para recolher saldos",()=>{
    const deadlines=extractNcDeadlines("EMPENHO ATE 30 JUN 26. RECOLHER SALDOS ATE 01 JUL 26.","2026NC000001");
    expect(deadlines.map(d=>[d.kind,d.date])).toEqual([["EMPENHO","2026-06-30"],["RECOLHIMENTO","2026-07-01"]]);
  });
  it("não converte data de DIEx, data inválida ou prazo relativo em vencimento",()=>{
    expect(extractNcDeadlines("ATD DIEX DE 21 OUT 26. EMPH ATE 31FEV26. PRAZO PARA EMPENHO: 30 DIAS.","2026NC000001")).toEqual([]);
  });
  it("filtra todo o universo antes de paginar e deduplica linhas contábeis",()=>{
    const rows=Array.from({length:40},(_,i)=>({ug:"160136",nc:`2026NC${String(i).padStart(6,"0")}`,ncDescription:i===39?"EMPH ATE 21OUT26":"EMPH ATE 30NOV26"} as TgRow));
    rows.push({...rows[39]},{...rows[39],ug:"160142"});
    const result=queryNcDeadlines(rows,{ug:"160136",status:"TODAY",limit:1},"2026-10-21");
    expect(result.scannedDocuments).toBe(40);
    expect(result.matchedDeadlines).toBe(1);
    expect(result.records[0].nc).toBe("2026NC000039");
    expect(result.records[0].ug).toBe("160136");
  });
  it("hoje usa Campo Grande, não o dia UTC",()=>{
    expect(localReferenceDay(new Date("2026-10-22T02:00:00Z"))).toBe("2026-10-21");
  });
});
