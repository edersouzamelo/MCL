import { tool } from "ai";
import { z } from "zod";
import type { MclAiActor, MclToolEnvelope } from "./contracts";
import { getLatestTg } from "@/modules/credits-tg/repository";
import { prisma } from "@/server/db";
import { queryTgEvidence, TG_EVIDENCE_FIELDS } from "./tg-evidence";
import { queryNcDeadlines, localReferenceDay } from "./nc-deadlines";
import { queryTgNcComposition } from "./silos";

/** One read-only, organization-bound source cache per conversation request. */
export function createTgEvidenceTools(actor: MclAiActor) {
  let source: ReturnType<typeof getLatestTg> | undefined;
  const snapshot = () => source ??= actor.organizationId && process.env.DATABASE_URL
    ? getLatestTg(actor.organizationId) : Promise.resolve(null);
  async function evidence<T>(project: (value: NonNullable<Awaited<ReturnType<typeof getLatestTg>>>) => T): Promise<MclToolEnvelope<T | { records: never[] }>> {
    const value = await snapshot();
    if (!value) return { status:"UNAVAILABLE", dataNature:"NONE", asOf:new Date().toISOString(), citations:[],
      gaps:["Nenhuma carga TG persistida está disponível na organização autenticada."],data:{records:[]} };
    return { status:"AVAILABLE", dataNature:"CALCULATED_FROM_PERSISTED", asOf:value.importedAt,
      citations:[{title:value.fileName,source:"TESOURO_GERENCIAL",asOf:value.importedAt,dataNature:"PERSISTED_OPERATIONAL"}],
      gaps: Date.now()-Date.parse(value.importedAt)>86_400_000 ? ["A carga tem mais de 24 horas; não representa saldo ao vivo."] : [],
      data:project(value) };
  }
  return {
    explorarFonteTg: tool({
      description: "Explora TODOS os campos e registros da carga TG autorizada. Comece com operation=schema para conhecer medidas, campos e UGs; depois consulte rows para evidências documentais ou aggregate para somas exatas por um único Item Informação. Filtros são aplicados a toda a carga antes de limitar a exibição. ncDescription/neDescription contêm textos integrais. Nunca some itens diferentes. Nunca atribua saldo remanescente por NC. Use os filtros ug/PI/ND confirmados na conversa.",
      inputSchema:z.object({ operation:z.enum(["schema","rows","aggregate"]),
        filters:z.array(z.object({field:z.enum(TG_EVIDENCE_FIELDS),operator:z.enum(["eq","contains","present"]),
          value:z.union([z.string(),z.number(),z.boolean(),z.null()]).optional()})).max(12).default([]),
        fields:z.array(z.enum(TG_EVIDENCE_FIELDS)).max(20).default([]),
        groupBy:z.array(z.enum(TG_EVIDENCE_FIELDS)).max(4).default([]),
        offset:z.number().int().min(0).max(1_000_000).default(0),limit:z.number().int().min(1).max(30).default(10),
        sort:z.enum(["VALUE_ASC","VALUE_DESC"]).default("VALUE_DESC"),
      }),
      execute:async (input) => {
        const result=await evidence(value => queryTgEvidence(value,input));
        if(input.operation!=="schema" || !actor.organizationId) return result;
        const organization=await prisma.organization.findUnique({where:{id:actor.organizationId},select:{uasg:true}});
        return {...result,data:{...result.data,ownUasg:organization?.uasg??null}};
      },
    }),
    consultarPrazosNc: tool({
      description: "Lê as descrições de TODAS as NC do filtro e extrai prazos de EMPENHO ou RECOLHIMENTO com data e trecho comprobatório. Para NC que vence hoje, consulte status=TODAY; para vencidas OVERDUE; para as próximas UPCOMING. Hoje usa o fuso de Campo Grande. Não confunda emissão com prazo. O resultado não comprova saldo disponível individual nem que uma obrigação continue pendente. Ausência de data reconhecida é lacuna, não ausência de prazo.",
      inputSchema:z.object({ug:z.string().regex(/^\d{6}$/).optional(),nd:z.string().max(20).optional(),pi:z.string().max(80).optional(),
        kind:z.enum(["EMPENHO","RECOLHIMENTO","ALL"]).default("ALL"),
        status:z.enum(["TODAY","OVERDUE","UPCOMING","ALL"]).default("ALL"),
        referenceDay:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data explicitamente pedida pelo usuário. Omitir para hoje."),
        offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(30).default(10)}),
      execute:async ({referenceDay,...input}) => {
        const day=referenceDay??localReferenceDay(new Date());
        if(!Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10)!==day) throw new Error("Data de referência inválida.");
        return evidence(value=>({source:{fileName:value.fileName,checksum:value.checksum,importedAt:value.importedAt},
          ...queryNcDeadlines(value.rows,input,day)}));
      },
    }),
    consultarNotasCredito:tool({
      description:"Consulta documental de NC por UG, ND e PI. São documentos da provisão, não uma lista de saldos disponíveis. Para prazos use consultarPrazosNc; para perguntas sobre saldo consulte os totais e explique a ausência de vínculo NC-NE. Não repita uma lista de NC como resposta a uma pergunta de confirmação sobre o saldo.",
      inputSchema:z.object({ug:z.string().max(100).optional(),nd:z.string().max(20).optional(),pi:z.string().max(80).optional(),
        offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(30).default(10)}),
      execute:async input=>queryTgNcComposition(actor,input),
    }),
  };
}
