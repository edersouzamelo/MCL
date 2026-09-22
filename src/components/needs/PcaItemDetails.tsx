"use client";

import { useEffect, useState } from "react";

type Fields = Record<string, unknown>;
type Detail = { pncpData: Fields; pgcData: Fields[] | null; pgcSynchronizedAt: string | null; sourceUrl: string | null };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });

function format(value: unknown, key: string) {
  if (value == null || value === "" || value === "-") return "Não informado pela fonte";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return key.toLowerCase().includes("valor") ? money.format(value) : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
  if (typeof value === "object") return JSON.stringify(value);
  if (key.startsWith("data") && /^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10).split("-").reverse().join("/");
  return String(value);
}
function FieldList({ data, fields }: { data: Fields; fields: Array<[string, string]> }) {
  return <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key, label]) => <div key={key} className={key.toLowerCase().includes("descricao") ? "sm:col-span-2 lg:col-span-3" : ""}>
    <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-900 dark:text-zinc-100">{format(data[key], key)}</dd>
  </div>)}</dl>;
}
function AllFields({ data }: { data: Fields }) {
  return <details className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-700"><summary className="cursor-pointer text-xs font-semibold text-sky-700 dark:text-sky-400">Todos os campos recebidos da fonte</summary><dl className="mt-3 grid gap-2">{Object.entries(data).map(([key, value]) => <div key={key} className="grid gap-1 text-xs sm:grid-cols-[230px_1fr]"><dt className="break-all font-mono text-zinc-500">{key}</dt><dd className="whitespace-pre-wrap break-words">{value == null ? "Não informado pela fonte" : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details>;
}
const pncpFields: Array<[string, string]> = [
  ["pdmDescricao", "Denominação do material"], ["descricao", "Descrição publicada no PCA"],
  ["codigoItem", "Código de catálogo"], ["nomeClassificacao", "Material ou serviço"],
  ["unidadeFornecimento", "Unidade de fornecimento"], ["quantidade", "Quantidade planejada"],
  ["valorUnitario", "Valor unitário estimado"], ["valorTotal", "Valor total estimado"],
  ["grupoContratacaoCodigo", "Código da contratação planejada"], ["grupoContratacaoNome", "Contratação planejada"],
  ["unidadeRequisitante", "Unidade requisitante"], ["dataDesejada", "Data desejada"],
];
const pgcFields: Array<[string, string]> = [
  ["descricaoObjetoDfd", "Objeto da demanda (DFD)"], ["descricaoItemCatalogo", "Descrição do item no PGC"],
  ["numeroArtefato", "Número do artefato"], ["anoArtefato", "Ano do artefato"], ["ordemDfd", "Ordem do item no DFD"],
  ["nivelPrioridadeDfd", "Prioridade (código da fonte)"], ["codigoAreaDfd", "Área requisitante (código)"],
  ["nomeUnidadeFornecimento", "Unidade de fornecimento"], ["siglaUnidadeFornecimento", "Sigla da unidade"],
  ["quantidadeItem", "Quantidade no PGC"], ["valorUnitarioItem", "Valor unitário no PGC"], ["valorTotalItem", "Valor total no PGC"],
  ["tituloProjetoCompra", "Projeto de compra"], ["descricaoProjetoCompra", "Descrição do projeto de compra"],
  ["dataPrevistaFormalizacaoDemanda", "Data prevista da demanda"], ["dataInicioProcessoCompra", "Início previsto do processo"],
  ["dataFimProcessoCompra", "Fim previsto do processo"], ["numeroItemPncp", "Item correspondente no PNCP"],
  ["dataHoraAtualizacaoDfd", "Atualização do DFD na fonte"],
];

export function PcaItemDetails({ id, uasg, year }: { id: string; uasg: string; year: number }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ itemId: id, uasg, year: String(year) });
    fetch(`/api/necessidades/pca?${params}`, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível consultar os detalhes.");
      if (!controller.signal.aborted) setData(payload.item);
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha na consulta."); });
    return () => controller.abort();
  }, [id, uasg, year]);
  if (error) return <p role="alert" className="p-5 text-amber-800 dark:text-amber-300">{error}</p>;
  if (!data) return <p role="status" className="p-5 text-zinc-500">Carregando detalhes armazenados…</p>;
  const records = Array.isArray(data.pgcData) ? data.pgcData : [];
  return <div className="space-y-5 bg-sky-50/50 p-5 dark:bg-sky-950/20">
    <section aria-label="Dados do PCA"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Item publicado no PCA · PNCP</h3>{data.sourceUrl?.startsWith("https://pncp.gov.br/") && <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky-700 underline dark:text-sky-400">Abrir plano no PNCP</a>}</div><FieldList data={data.pncpData} fields={pncpFields}/></section>
    <section aria-label="Dados dos DFDs" className="rounded-lg border border-sky-200 bg-white p-4 dark:border-sky-900 dark:bg-zinc-900">
      <h3 className="font-bold">Demanda de origem · PGC / Compras.gov.br</h3>
      <p className="mb-4 mt-1 text-xs text-zinc-500">{data.pgcSynchronizedAt ? `Consultado em ${new Date(data.pgcSynchronizedAt).toLocaleString("pt-BR")}` : "Dados complementares ainda não consultados."}</p>
      {records.length ? records.map((record, index) => <article key={index} className="mb-5 border-b border-zinc-200 pb-5 last:mb-0 last:border-0 last:pb-0 dark:border-zinc-700">
        <h4 className="mb-3 font-semibold">DFD / artefato {String(record.descricaoArtefato ?? "sem identificação")}</h4>
        <FieldList data={record} fields={pgcFields}/><AllFields data={record}/>
      </article>) : <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.pgcSynchronizedAt ? "Não foi localizado um vínculo seguro com o DFD nesta consulta. Isso não significa que o documento não exista no PGC." : "Use Atualizar DFDs para consultar e armazenar os dados complementares desta UASG."}</p>}
      <p className="mt-4 text-xs text-zinc-500">Esta ficha mostra os dados publicados pela API do PGC. O documento integral, justificativas e anexos não foram disponibilizados por esta integração.</p>
    </section>
    <AllFields data={data.pncpData}/>
  </div>;
}
