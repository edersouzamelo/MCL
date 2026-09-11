"use client";

import React, { useState } from "react";
import {
  BookOpen,
  X,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  ShieldCheck,
  Bot,
  User,
  Server,
} from "lucide-react";

interface TechnicalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TechnicalGuideModal({ isOpen, onClose }: TechnicalGuideModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    const promptText = `Manual de Configuração e Replicação do Módulo de Créditos Orçamentários MCL para IAs e Gestores:
1. Acesse o Tesouro Gerencial (tesourogerencial.tesouro.gov.br).
2. Use o contrato V2 homologado: UG Executora, PI, Ação Governo, Fonte Recursos, UGR - Gestão, PTRES, Item Informação, ND detalhada, campos de NE, NC, RO, Documento e Movim. Líquido.
3. Preserve os 17 Itens Informação homologados: 15, 16, 19, 29, 30, 31, 32, 34, 40 a 47 e 91. Doc - Valor é apenas documental e nunca compõe os saldos.
4. Aplique os filtros: UG Executora Na Lista (todas as UGs administrativas da Grande Unidade) E Ano Lançamento = exercício desejado.
5. Salve com o nome MCL_MESTRE_EXERCICIO_2026.
6. Em Arquivo > Inscrever-se em > E-mail, selecione 'Todos os dias após a atualização dos dados', formato Excel (.xlsx), use o assunto MCL_MESTRE_EXERCICIO_2026 e confira que o filtro do Apps Script corresponde ao assunto recebido.
7. Confira o projeto Apps Script existente na conta receptora e seu gatilho temporal. O script envia o anexo ao webhook autenticado; uma regra comum de encaminhamento do Gmail não substitui esse envio HTTP.
8. Use integrations/apps-script/robo-mcl-tg.gs no projeto Robô_MCL existente. Configure MCL_WEBHOOK_TOKEN e MCL_ORGANIZATION_CODE nas Propriedades do script. A função mantém o nome enviarPlanilhaSiafiParaMCL e envia o arquivo ao parser TG próprio. TG e CCO/SAG são independentes.
9. A UG Executora é administrativa; não a transforme em OM beneficiária/requisitante. Essa classificação depende de dado próprio do MCL/SAG.
10. Conferir uma execução completa: mensagem recebida, webhook aceito, checksum persistido, totais reconciliados e data da fonte exibida no painel.`;
    try { await navigator.clipboard.writeText(promptText); setCopied(true); }
    catch { setCopied(false); return; }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSchema = () => {
    const pluginSchema = {
      module: "MCL Budget Credits & SIAFI Integration Plugin",
      version: "1.0.1",
      status: "TG_MASTER_V2_HOMOLOGATED",
      source: "TESOURO_GERENCIAL",
      excludes: ["SAG_CCO"],
      validationRequired: ["OM beneficiária/requisitante", "Metas", "Pregões SRP", "Execução do Robô_MCL em produção"],
      idealizer: "Edervaldo José De Souza Melo",
      contact: "edersouzamelo@gmail.com",
      supportedUGs: ["160136", "160142", "160513", "167136", "167142", "167513"],
      targetSystem: "MCL - Modelo de Continuidade Logística",
      extractionSchema: {
        reportName: "MCL_MESTRE_EXERCICIO_2026",
        columns: [
          "UG Executora",
          "Ação Governo",
          "Fonte Recursos",
          "UGR - Gestão",
          "PTRES",
          "PI (Plano Interno)",
          "Item Informação",
          "NE CCor",
          "NE CCor - Ano Emissão",
          "NE CCor - Favorecido",
          "Natureza Despesa Detalhada",
          "Movim. Líquido - R$ (Item Informação)",
        ],
        frequency: "Daily after source refresh; actual schedule requires verification",
        ingestionEndpoint: "/api/connectors/siafi/upload",
      },
    };

    const blob = new Blob([JSON.stringify(pluginSchema, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcl-modulo-orcamentario-plugin.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="original-tg-guide-title" className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 id="original-tg-guide-title" className="text-lg font-bold text-white flex items-center gap-2">
                Guia de Orientação Técnica · Módulo Orçamentário MCL
              </h2>
              <p className="text-xs text-zinc-400">
                Manual de replicação para novas UGs/OMs e especificação da ponte automatizada de dados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar guia técnico"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm text-zinc-300">
          <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-100 space-y-2">
            <p className="font-bold">Contrato contábil V2 homologado em 11 SET</p>
            <p>O XLSX final contém 50 colunas, 36.773 linhas e Item Informação por registro. O parser distingue provisão, empenho, liquidação, pagamento, NC e RPNP.</p>
            <p>A visão macro mantém todas as UGs administrativas. OM beneficiária/requisitante, metas e pregões SRP continuam sendo dimensões/fontes próprias e não são inferidos.</p>
          </div>
          {/* Developer & Idealizer Callout Card */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Idealizador & Desenvolvedor da Solução
              </span>
              <h3 className="text-base font-bold text-white">Edervaldo José De Souza Melo</h3>
              <p className="text-xs text-zinc-400">
                Projeto MCL (Modelo de Continuidade Logística) · Suporte para implementação em novas Unidades Gestoras.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSchema}
                className="px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Download className="h-4 w-4" /> Baixar Especificação (Plugin JSON)
              </button>
            </div>
          </div>

          {/* Section 1: Passo a Passo para Humanos e Agentes de IA */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Bot className="h-5 w-5 text-emerald-400" />
              1. Passo a Passo de Replicação para Novas OMs (Humanos & Agentes de IA)
            </h3>
            <p className="text-xs text-zinc-400">
              O protocolo original de preparação no Tesouro Gerencial tem as três etapas abaixo. A replicação completa também exige homologar o webhook TG e conferir o Apps Script e seu gatilho, conforme a retificação acima:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-white text-xs">Criar Relatório Mestre no TG</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Use o contrato V2 com <code className="text-emerald-400">UG Executora</code>, ação, fonte, UGR, PTRES, PI, <code className="text-emerald-400">Item Informação</code>, ND e os campos de NE, NC, RO e Documento. Não remova as UGs sem empenho recente: elas preservam a visão histórica da Grande Unidade.
                </p>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="font-bold text-white text-xs">Filtros Dinâmicos</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Aplique <code className="text-emerald-400">UG Executora Na Lista</code> com todas as UGs da Grande Unidade e <code className="text-emerald-400">Ano Lançamento = exercício</code>. Salve como <code className="text-emerald-400">MCL_MESTRE_EXERCICIO_2026</code>.
                </p>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h4 className="font-bold text-white text-xs">Subscrição Automática</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Em Arquivo &gt; Inscrever-se em &gt; E-mail, selecione <code className="text-emerald-400">Todos os dias após a atualização dos dados</code> em formato Excel com o assunto observado <code className="text-emerald-400">MCL_MESTRE_EXERCICIO_2026</code>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCopyPrompt}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5 text-emerald-400" />
                {copied ? "Instruções Copiadas!" : "Copiar Instruções para IA / Prompt"}
              </button>
            </div>
          </div>

          <section className="rounded-xl border border-emerald-700 p-4 space-y-3">
            <h3 className="font-bold text-white">Configuração do Robô_MCL existente</h3>
            <p>Use o <a className="underline text-emerald-400" href="https://github.com/edersouzamelo/MCL/blob/main/integrations/apps-script/robo-mcl-tg.gs" target="_blank" rel="noreferrer">código de recuperação do Robô_MCL</a>. Ele preserva o nome enviarPlanilhaSiafiParaMCL, usado pelo gatilho existente. Não exclua nem recrie o gatilho sem verificar sua configuração.</p>
            <p>Em Configurações do projeto → Propriedades do script, configure MCL_WEBHOOK_TOKEN com o mesmo segredo de MCL_SIAFI_WEBHOOK_TOKEN no servidor e MCL_ORGANIZATION_CODE com o número da UASG da organização cadastrada. O usuário não precisa informar nem vincular UASG no módulo. Não coloque segredos no código nem no chat.</p>
            <p>Execute a função uma vez e confira TG_PERSISTIDO, rowCount, checksum e persistedAt no Registro de execução. HTTP 401 indica autenticação; 404 indica organização; rejeição do arquivo exige conferir o relatório. Uma execução sem anexos não comprova ingestão.</p>
            <p>Como contingência, o painel permite validar e confirmar a importação do XLSX pela sessão de administrador ou gestor. O V2 projeta NC, NE e RPNP pelo Item Informação. Metas, SRP e OM beneficiária/requisitante continuam dependendo de fontes próprias.</p>
          </section>

          {/* Section 2: Arquitetura de Segurança da Ponte de E-mail */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              2. Como Funciona a Ponte de Automação Sem Senhas ou Terminais Abertos?
            </h3>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-emerald-400">Você NUNCA precisará fornecer sua senha de e-mail ao MCL nem manter o computador ligado.</strong> A ponte é construída usando o padrão corporativo seguro de <strong>Encaminhamento Passivo via Webhook / Google Apps Script</strong>:
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                  <Mail className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">1. O Tesouro Gerencial (SERPRO) dispara o e-mail</strong>
                    <p className="text-zinc-400 text-[11px]">De madrugada, o TG envia a planilha para a sua conta corporativa/Gmail cadastrada.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                  <Server className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">2. Regra do Gmail / Google Apps Script (Zero Senha)</strong>
                    <p className="text-zinc-400 text-[11px]">
                      Um pequeno Script gratuito no seu próprio Google Drive detecta a chegada do e-mail pelo assunto <code className="text-emerald-400">MCL_MESTRE_EXERCICIO_2026</code> e envia o anexo `.xlsx` diretamente para o Webhook seguro do MCL (<code className="text-emerald-400">https://mcl-one.vercel.app/api/connectors/siafi/upload</code>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">3. Atualização Passiva de 10 Telas no MCL</strong>
                    <p className="text-zinc-400 text-[11px]">
                      O servidor valida o arquivo, preserva o bruto no PostgreSQL com checksum e envia ao navegador apenas projeções consolidadas de indicadores, NC, NE e RPNP. Não existe volumetria fixa: cada carga pode conter quantidade diferente de linhas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            MCL · Modelo de Continuidade Logística
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors"
          >
            Fechar Manual
          </button>
        </div>
      </div>
    </div>
  );
}
