"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Landmark,
  Link as LinkIcon,
  Search,
} from "lucide-react";
import type {
  ArpUnitRecord,
  CatalogSearchCandidate,
  ItemCatalogMapping,
} from "@/modules/domain/types";
import type { ArpSearchEntry, CoverageSynthesis } from "@/modules/coverage/service";
import { Badge, Card, formatDateTime } from "@/components/ui";

type JourneyNeed = {
  id: string;
  persistentCode: string;
  quantityRequested: number;
  quantityApproved: number;
  status: string;
  priority: string;
  requiredAt: string;
};

type JourneyItem = {
  id: string;
  name: string;
  description: string;
  supplyClass: string;
  baseUnit: string;
};

type JourneyVariant = {
  id: string;
  label: string;
  size: string;
  unit: string;
};

type Projection = {
  stockCovered: number;
  deficit: number;
  coveragePercent: number;
  deliveredPercent: number;
};

type ApiResult<T> = T & { error?: string };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || result.error) {
    throw new Error(result.error ?? "Falha na requisicao.");
  }
  return result;
}

function money(value?: number) {
  if (value === undefined) {
    return "sem valor";
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function number(value?: number) {
  if (value === undefined) {
    return "nao informado";
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function todayYearRange() {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function CoverageJourneyClient({
  need,
  item,
  variant,
  organizationName,
  projection,
  initialMapping,
}: {
  need: JourneyNeed;
  item: JourneyItem;
  variant: JourneyVariant;
  organizationName: string;
  projection: Projection;
  initialMapping?: ItemCatalogMapping;
}) {
  const router = useRouter();
  const [range] = useState(todayYearRange);
  const [terms, setTerms] = useState("bota seguranca couro cano");
  const [dateStart, setDateStart] = useState(range.start);
  const [dateEnd, setDateEnd] = useState(range.end);
  const [candidates, setCandidates] = useState<CatalogSearchCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>();
  const [mapping, setMapping] = useState<ItemCatalogMapping | undefined>(initialMapping);
  const [justification, setJustification] = useState("Confirmacao humana demonstrativa para correlacionar o CATMAT ao item MCL.");
  const [entries, setEntries] = useState<ArpSearchEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ArpSearchEntry>();
  const [unitRecords, setUnitRecords] = useState<ArpUnitRecord[]>([]);
  const [synthesis, setSynthesis] = useState<CoverageSynthesis>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<string>();

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId);

  async function guarded<T>(label: string, action: () => Promise<T>) {
    setPending(label);
    setError(undefined);
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha inesperada.");
      return undefined;
    } finally {
      setPending(undefined);
    }
  }

  async function searchCatmat() {
    await guarded("catmat", async () => {
      const result = await postJson<{ candidates: CatalogSearchCandidate[] }>("/api/coverage/catmat/search", {
        needId: need.id,
        terms,
      });
      setCandidates(result.candidates);
      setSelectedCandidateId(result.candidates[0]?.id);
      setMessage(`${result.candidates.length} candidatos CATMAT preparados para revisao.`);
    });
  }

  async function confirmCatmat() {
    if (!selectedCandidate) {
      setError("Selecione um candidato CATMAT.");
      return;
    }
    await guarded("confirm", async () => {
      const result = await postJson<{ mapping: ItemCatalogMapping }>("/api/coverage/catmat/confirm", {
        needId: need.id,
        candidateId: selectedCandidate.id,
        justification,
        confidence: Math.max(0.55, selectedCandidate.similarityScore),
      });
      setMapping(result.mapping);
      setMessage(`CATMAT ${result.mapping.externalItemCode} confirmado na versao ${result.mapping.mappingVersion}.`);
      router.refresh();
    });
  }

  async function revokeCatmat() {
    if (!mapping) {
      return;
    }
    await guarded("revoke", async () => {
      await postJson<{ mapping: ItemCatalogMapping }>("/api/coverage/catmat/revoke", {
        mappingId: mapping.id,
        reason: "Revogacao demonstrativa solicitada pelo operador para substituir a correlacao CATMAT.",
      });
      setMapping(undefined);
      setEntries([]);
      setSelectedEntry(undefined);
      setUnitRecords([]);
      setSynthesis(undefined);
      setMessage("Mapeamento CATMAT revogado.");
      router.refresh();
    });
  }

  async function searchAtas() {
    await guarded("atas", async () => {
      const result = await postJson<{ entries: ArpSearchEntry[]; synthesis: CoverageSynthesis }>(
        "/api/coverage/atas/search",
        {
          needId: need.id,
          dataVigenciaInicialMin: dateStart,
          dataVigenciaInicialMax: dateEnd,
        },
      );
      setEntries(result.entries);
      setSelectedEntry(result.entries[0]);
      setSynthesis(result.synthesis);
      setUnitRecords([]);
      setMessage(`${result.entries.length} atas relacionadas ao CATMAT confirmado.`);
    });
  }

  async function consultUnits(entry = selectedEntry) {
    if (!entry) {
      setError("Selecione uma ata.");
      return;
    }
    await guarded("units", async () => {
      const result = await postJson<{ records: ArpUnitRecord[]; synthesis: CoverageSynthesis }>("/api/coverage/atas/units", {
        needId: need.id,
        acquisitionInstrumentId: entry.instrument.id,
        ...entry.unitQuery,
      });
      setUnitRecords(result.records);
      setSynthesis(result.synthesis);
      setMessage(`${result.records.length} unidades retornadas pela fonte para a ata selecionada.`);
    });
  }

  async function registerPossibleCoverage() {
    if (!selectedEntry || !synthesis) {
      setError("Selecione uma ata e gere a sintese antes de registrar cobertura possivel.");
      return;
    }
    await guarded("link", async () => {
      await postJson("/api/aquisicoes/links", {
        needId: need.id,
        acquisitionInstrumentId: selectedEntry.instrument.id,
        confidence: synthesis.confidence,
        justification: `Cobertura potencial registrada apos CATMAT ${mapping?.externalItemCode} e consulta deterministica de atas.`,
      });
      setMessage("Cobertura possivel registrada no MCL.");
      router.refresh();
    });
  }

  const steps = [
    ["1", "Necessidade", true],
    ["2", "Deficit", true],
    ["3", "CATMAT", candidates.length > 0 || Boolean(mapping)],
    ["4", "Confirmacao", Boolean(mapping)],
    ["5", "Atas", entries.length > 0],
    ["6", "Ata", Boolean(selectedEntry)],
    ["7", "Unidades", unitRecords.length > 0],
    ["8", "Sintese", Boolean(synthesis)],
    ["9", "Registro", false],
    ["10", "Painel", false],
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-2 sm:grid-cols-5 lg:grid-cols-10">
          {steps.map(([numberLabel, label, done]) => (
            <div key={numberLabel} className="rounded bg-zinc-50 p-2 text-xs">
              <span className="font-semibold text-zinc-500">{numberLabel}</span>
              <p className="mt-1 font-semibold text-zinc-900">{label}</p>
              <p className={done ? "text-emerald-700" : "text-zinc-500"}>{done ? "pronto" : "pendente"}</p>
            </div>
          ))}
        </div>
      </Card>

      {message ? <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p> : null}
      {error ? (
        <p className="flex items-center gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertCircle aria-hidden className="h-4 w-4" />
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">{need.persistentCode}</p>
              <h2 className="mt-1 text-lg font-semibold">{item.name}</h2>
              <p className="text-sm text-zinc-600">{variant.label}</p>
            </div>
            <Badge tone={need.priority === "ALTA" ? "warn" : "neutral"}>{need.status}</Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Organizacao</dt><dd className="font-semibold">{organizationName}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Classe interna</dt><dd className="font-semibold">{item.supplyClass}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Solicitado</dt><dd className="font-semibold">{need.quantityRequested} {variant.unit}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Estoque coberto</dt><dd className="font-semibold">{projection.stockCovered} {variant.unit}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Deficit</dt><dd className="font-semibold">{projection.deficit} {variant.unit}</dd></div>
            <div className="rounded bg-zinc-50 p-3"><dt className="text-zinc-500">Entrega fisica</dt><dd className="font-semibold">{projection.deliveredPercent}%</dd></div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Search aria-hidden className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-semibold">Pesquisa CATMAT</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="text-sm">
              <span className="font-semibold text-zinc-700">Termos adicionais</span>
              <input
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={searchCatmat}
              disabled={pending === "catmat"}
              className="self-end rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400"
            >
              {pending === "catmat" ? "Buscando" : "Buscar CATMAT"}
            </button>
          </div>

          {mapping ? (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-emerald-950">CATMAT confirmado: {mapping.externalItemCode}</p>
                  <p className="mt-1 text-emerald-900">{mapping.externalDescription}</p>
                  <p className="mt-1 text-xs text-emerald-800">Versao {mapping.mappingVersion} - confianca {Math.round(mapping.confidence * 100)}%</p>
                </div>
                <button
                  type="button"
                  onClick={revokeCatmat}
                  disabled={pending === "revoke"}
                  className="inline-flex items-center gap-2 rounded border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-900 disabled:text-zinc-400"
                >
                  <Ban aria-hidden className="h-4 w-4" />
                  Revogar
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold">Candidatos CATMAT</h2>
        </div>
        {candidates.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`rounded border p-3 text-left text-sm ${
                  selectedCandidateId === candidate.id ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">CATMAT {candidate.externalItemCode}</p>
                  <Badge tone={candidate.statusItem ? "good" : "warn"}>{candidate.statusItem ? "ativo" : "inativo"}</Badge>
                </div>
                <p className="mt-2 line-clamp-4 text-zinc-700">{candidate.externalDescription}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-600">
                  <div><dt>Grupo</dt><dd className="font-semibold">{candidate.groupCode ?? "-"}</dd></div>
                  <div><dt>Classe</dt><dd className="font-semibold">{candidate.classCode ?? "-"}</dd></div>
                  <div><dt>PDM</dt><dd className="font-semibold">{candidate.pdmCode ?? "-"}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-zinc-600">Similaridade {Math.round(candidate.similarityScore * 100)}% - {candidate.similarityExplanation}</p>
                <p className="mt-1 text-xs text-zinc-500">Origem {candidate.sourceSystem} - {candidate.sourceUpdatedAt ? formatDateTime(candidate.sourceUpdatedAt) : "sem atualizacao"}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">Nenhuma pesquisa CATMAT executada nesta sessao.</p>
        )}
        {selectedCandidate && !mapping ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="text-sm">
              <span className="font-semibold text-zinc-700">Justificativa da confirmacao</span>
              <input
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={confirmCatmat}
              disabled={pending === "confirm"}
              className="self-end rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400"
            >
              {pending === "confirm" ? "Confirmando" : "Confirmar CATMAT"}
            </button>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Landmark aria-hidden className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold">Atas relacionadas</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <label>
                <span className="font-semibold text-zinc-700">Inicio</span>
                <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} className="mt-1 block rounded border border-zinc-300 px-3 py-2" />
              </label>
              <label>
                <span className="font-semibold text-zinc-700">Fim</span>
                <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} className="mt-1 block rounded border border-zinc-300 px-3 py-2" />
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={searchAtas}
            disabled={!mapping || pending === "atas"}
            className="inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400"
          >
            <ClipboardList aria-hidden className="h-4 w-4" />
            {pending === "atas" ? "Consultando" : "Consultar atas"}
          </button>
        </div>

        {entries.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {entries.map((entry) => {
              const selected = selectedEntry?.instrument.id === entry.instrument.id;
              return (
                <button
                  key={entry.instrument.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className={`rounded border p-3 text-left text-sm ${selected ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{entry.instrument.reference}</p>
                      <p className="text-zinc-600">{entry.instrument.organizationName ?? entry.instrument.organizationCode}</p>
                    </div>
                    <Badge tone="info">{entry.instrument.status}</Badge>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div><dt>Fornecedor</dt><dd className="font-semibold">{entry.instrument.supplierName ?? "nao informado"}</dd></div>
                    <div><dt>Vigencia</dt><dd className="font-semibold">{formatDateTime(entry.instrument.validFrom)} ate {formatDateTime(entry.instrument.validUntil)}</dd></div>
                    <div><dt>Qtd. homologada</dt><dd className="font-semibold">{number(entry.instrument.quantity)}</dd></div>
                    <div><dt>Max. adesao</dt><dd className="font-semibold">{number(entry.instrument.capacity)}</dd></div>
                    <div><dt>Valor unitario</dt><dd className="font-semibold">{money(entry.instrument.unitValue)}</dd></div>
                    <div><dt>Valor total</dt><dd className="font-semibold">{money(entry.instrument.totalValue)}</dd></div>
                  </dl>
                  <p className="mt-2 text-xs text-zinc-500">PNCP/referencia: {entry.instrument.externalReference ?? "nao informada"}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">Nenhuma ata consultada nesta sessao.</p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 aria-hidden className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold">Unidades e saldos</h2>
            </div>
            <button
              type="button"
              onClick={() => consultUnits()}
              disabled={!selectedEntry || pending === "units"}
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400"
            >
              {pending === "units" ? "Consultando" : "Consultar unidades"}
            </button>
          </div>
          {unitRecords.length ? (
            <div className="mt-4 max-h-[420px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2">Unidade</th>
                    <th>Tipo</th>
                    <th>Qtd.</th>
                    <th>Saldo adesoes</th>
                    <th>Saldo remanejamento</th>
                    <th>Aceita adesao</th>
                  </tr>
                </thead>
                <tbody>
                  {unitRecords.map((record) => (
                    <tr key={record.id} className="border-b border-zinc-100">
                      <td className="py-2">{record.codigoUnidade} - {record.nomeUnidade}</td>
                      <td>{record.tipoUnidade ?? "-"}</td>
                      <td>{number(record.quantidadeRegistrada)}</td>
                      <td>{number(record.saldoAdesoes)}</td>
                      <td>{number(record.saldoRemanejamentoEmpenho)}</td>
                      <td>{record.aceitaAdesao ? "sim" : "nao informado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Selecione uma ata e consulte as unidades participantes.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <BarChart3 aria-hidden className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-semibold">Sintese deterministica</h2>
          </div>
          {synthesis ? (
            <div className="mt-4 space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-zinc-50 p-3"><dt>Deficit</dt><dd className="font-semibold">{number(synthesis.deficit)}</dd></div>
                <div className="rounded bg-zinc-50 p-3"><dt>Qtd. potencial</dt><dd className="font-semibold">{number(synthesis.potentialQuantity)}</dd></div>
                <div className="rounded bg-zinc-50 p-3"><dt>Atas vigentes</dt><dd className="font-semibold">{synthesis.currentAtaCount}</dd></div>
                <div className="rounded bg-zinc-50 p-3"><dt>Confianca</dt><dd className="font-semibold">{Math.round(synthesis.confidence * 100)}%</dd></div>
                <div className="rounded bg-zinc-50 p-3"><dt>Menor valor</dt><dd className="font-semibold">{money(synthesis.minUnitValue)}</dd></div>
                <div className="rounded bg-zinc-50 p-3"><dt>Maior valor</dt><dd className="font-semibold">{money(synthesis.maxUnitValue)}</dd></div>
              </dl>
              <div className="space-y-2 text-sm text-zinc-700">
                {synthesis.phrases.map((phrase) => (
                  <p key={phrase} className="rounded bg-zinc-50 p-3">{phrase}</p>
                ))}
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                {synthesis.limitations.map((limitation) => (
                  <p key={limitation}>{limitation}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={registerPossibleCoverage}
                disabled={!selectedEntry || pending === "link"}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400"
              >
                <LinkIcon aria-hidden className="h-4 w-4" />
                Registrar possivel cobertura
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">A sintese aparece depois da consulta de atas.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
