import {describe,expect,it} from "vitest";
import type {TgSnapshot} from "@/modules/credits-tg/repository";
import {queryTgEvidence} from "@/modules/ai/tg-evidence";

const snapshot={fileName:"fonte.xlsx",checksum:"digest",rows:Array.from({length:80},(_,i)=>({
  id:String(i),ug:i===79?"160142":"160136",om:"OM",itemCode:"19",itemDescription:"CREDITO DISPONIVEL",
  nc:i===0?"2026NC1":null,ncDescription:i===79?"OBJETO ÚNICO NO FINAL":null,movementCents:i===0?10000:-100,
}))} as unknown as TgSnapshot;
describe("exploração global da fonte TG",()=>{
  it("encontra evidência além da primeira página e preserva o texto",()=>{
    const result=queryTgEvidence(snapshot,{operation:"rows",filters:[{field:"ncDescription",operator:"contains",value:"objeto unico"}],fields:["id","ncDescription"]});
    expect(result).toMatchObject({scannedRows:80,matchedRows:1,records:[{id:"79",ncDescription:"OBJETO ÚNICO NO FINAL"}]});
  });
  it("soma Item 19 inclusive negativos sem NC, no filtro da unidade",()=>{
    const result=queryTgEvidence(snapshot,{operation:"aggregate",filters:[{field:"itemCode",operator:"eq",value:"19"},{field:"ug",operator:"eq",value:"160136"}]});
    expect(result).toMatchObject({matchedRows:79,totalMovementCents:2200});
  });
  it("recusa mistura de medidas e rateio de disponível por NC",()=>{
    expect(()=>queryTgEvidence(snapshot,{operation:"aggregate"})).toThrow("Item Informação");
    expect(()=>queryTgEvidence(snapshot,{operation:"aggregate",filters:[{field:"itemCode",operator:"eq",value:"19"}],groupBy:["nc"]})).toThrow("não comprova saldo");
  });
  it("expõe o catálogo real de campos, medidas e unidades",()=>{
    expect(queryTgEvidence(snapshot,{operation:"schema"})).toMatchObject({items:[{code:"19",description:"CREDITO DISPONIVEL"}],units:[{ug:"160136",om:"OM"},{ug:"160142",om:"OM"}]});
  });
});
