import type { AcquisitionInstrument, ArpUnitRecord, ItemCatalogMapping } from "@/modules/domain/types";
import type { MulticriteriaScoreResult } from "./multicriteria";

export type AdhesionDocumentParams = {
  needId: string;
  persistentCode: string;
  itemName: string;
  variantLabel: string;
  quantityRequested: number;
  deficit: number;
  organizationName: string;
  organizationUasg?: string;
  mapping: ItemCatalogMapping;
  instrument: AcquisitionInstrument;
  unitRecord?: ArpUnitRecord;
  scoreResult?: MulticriteriaScoreResult;
  justification?: string;
};

export function generateAdhesionDocument(params: AdhesionDocumentParams): string {
  const uasgSolicitante = params.organizationUasg || "160136";
  const orgSolicitante = params.organizationName || "Organização Militar Apoia";
  const uasgGerenciadora = params.unitRecord?.unidadeGerenciadora || params.instrument.organizationCode || "UG Gerenciadora";
  const numeroAta = params.instrument.externalReference || params.instrument.reference;
  const itemCode = params.mapping.externalItemCode;
  const itemDesc = params.mapping.externalDescription;
  const qtdEmpenhar = params.deficit > 0 ? params.deficit : params.quantityRequested;
  const valorUnitario = params.instrument.unitValue ? Number(params.instrument.unitValue) : 0;
  const valorTotalEstimado = qtdEmpenhar * valorUnitario;
  const fornecedor = params.instrument.supplierName || params.instrument.supplierNameSynthetic || "Fornecedor Registrado em Ata";
  const validade = params.instrument.validUntil ? new Date(params.instrument.validUntil).toLocaleDateString("pt-BR") : "Vigente";
  const score = params.scoreResult ? `${params.scoreResult.totalScore}/100 pts (${params.scoreResult.tier.replace(/_/g, " ")})` : "Não avaliado";

  return `MINUTA DE SOLICITAÇÃO DE ADESÃO À ATA DE REGISTRO DE PREÇOS (CARONA)
Fundamentação Legal: Lei nº 14.133, de 1º de abril de 2021, Art. 86, §§ 2º, 3º e 4º

---

1. IDENTIFICAÇÃO DA ORGANIZAÇÃO SOLICITANTE
   - Organização Militar / Unidade: ${orgSolicitante}
   - Código UASG: ${uasgSolicitante}
   - Código da Necessidade Logística (MCL): ${params.persistentCode} (${params.needId})

2. IDENTIFICAÇÃO DO MATERIAL / CATMAT CONFIRMADO
   - Código CATMAT Oficial: ${itemCode}
   - Descrição no Catálogo: ${itemDesc}
   - Especificação da Necessidade: ${params.itemName} (${params.variantLabel})
   - Quantidade Necessária (Déficit Apurado): ${qtdEmpenhar} un

3. IDENTIFICAÇÃO DA ATA DE REGISTRO DE PREÇOS ALVO
   - Número da Ata / Pregão: ${numeroAta}
   - Órgão Gerenciador (UASG): ${uasgGerenciadora}
   - Razão Social do Fornecedor: ${fornecedor}
   - Validade da Ata: até ${validade}
   - Valor Unitário Registrado: R$ ${valorUnitario.toFixed(2)}
   - Valor Total Estimado para Concessão: R$ ${valorTotalEstimado.toFixed(2)}
   - Classificação Operacional MCL (Score Multicritério): ${score}

4. ENQUADRAMENTO LEGAL E LIMITES DE ADESÃO (ART. 86 DA LEI 14.133/2021)
   - A presente solicitação fundamenta-se no Art. 86, caput da Lei nº 14.133/2021, que autoriza a adesão por órgãos não participantes (caronas).
   - Conforme o Art. 86, § 4º da Lei nº 14.133/2021, a quantidade pretendida (${qtdEmpenhar} un) não excede o limite legal de 50% (cinquenta por cento) dos quantitativos dos itens registrados na Ata de Registro de Preços para o órgão gerenciador e participantes.
   - O somatório das adesões não excede o limite global de 200% (duzentos por cento) do quantitativo do item (Art. 86, § 5º).

5. JUSTIFICATIVA DE CONVENIÊNCIA E EFICIÊNCIA ADMINISTRATIVA
   - A adesão à referida Ata de Registro de Preços demonstra-se extremamente vantajosa para a Administração Militar sob os aspectos de economicidade, celeridade processual e padronização logística de Classe II.
   - Justificativa do Operador Logístico: ${params.justification || "Atendimento imediato ao déficit logístico da OM sem a necessidade de instauração de novo certame licitatório."}

6. CONCLUSÃO E ENCAMINHAMENTO
   - Solicita-se a anuência do Órgão Gerenciador (UASG ${uasgGerenciadora}) e do Fornecedor Registrado para a concessão da adesão no quantitativo de ${qtdEmpenhar} un.

Local e Data: __________________________, _____ de __________________ de 20____.


______________________________________________________
Assinatura do Encarregado de Material / Gestor Logístico
`;
}
