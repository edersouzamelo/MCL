"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  MonitorCog,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { CCO_CLASS_SLIDES, CCO_RULE_SOURCE, findUnmappedPis } from "@/modules/grupamento/cco";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import { familyFieldName, SAG_PI_FAMILIES, type SagPiFamily } from "@/modules/grupamento/sag-family-batch";
import {
  CCO_DEFAULT_LOOP_DELAY_SECONDS,
  CCO_SCREEN_CATALOG,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  type CcoMonitorConfig,
  type CcoScreenId,
} from "@/modules/grupamento/monitor";

const SOURCE_ACCEPT = ".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type SagPairResponse = {
  current: SagImportResult;
  rpn: RpnImportResult;
  importedAt: string;
};

type LegacySagPair = {
  current: SagImportResult;
  rpn: RpnImportResult;
};

type SagUploadMode = "single" | "family";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function dateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR");
}

function emptyFamilyFiles(): Record<SagPiFamily, File | null> {
  return { E5: null, E6: null, E7: null, D8: null };
}

function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function GrupamentoCommandCenterClient({ organizationId }: { organizationId?: string }) {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [rpn, setRpn] = useState<RpnImportResult | null>(null);
  const [currentMode, setCurrentMode] = useState<SagUploadMode>("family");
  const [rpnMode, setRpnMode] = useState<SagUploadMode>("single");
  const [currentSingleFile, setCurrentSingleFile] = useState<File | null>(null);
  const [rpnSingleFile, setRpnSingleFile] = useState<File | null>(null);
  const [currentFiles, setCurrentFiles] = useState<Record<SagPiFamily, File | null>>(() => emptyFamilyFiles());
  const [rpnFiles, setRpnFiles] = useState<Record<SagPiFamily, File | null>>(() => emptyFamilyFiles());
  const [monitors, setMonitors] = useState<CcoMonitorConfig[]>(defaultCcoMonitorConfig());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [legacyPair, setLegacyPair] = useState<LegacySagPair | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(async () => {
      const storedMonitors = readStored<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors);
      if (storedMonitors?.length === 8) {
        setMonitors(storedMonitors.map((item) => ({
          ...item,
          layout: item.layout ?? "mcl",
          delaySeconds: item.delaySeconds === 15 ? CCO_DEFAULT_LOOP_DELAY_SECONDS : item.delaySeconds,
        })));
      }
      try {
        const response = await fetch("/api/grupamento/sag/latest", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Falha ao consultar a última carga persistida.");
        if (!cancelled) {
          setSag(payload.current ?? null);
          setRpn(payload.rpn ?? null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Falha ao consultar a última carga persistida.");
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GROUP_STORAGE_KEYS.monitors, JSON.stringify(monitors));
    window.dispatchEvent(new CustomEvent("mcl-grupamento-monitors-updated"));
  }, [monitors]);

  const sourceCount = Number(Boolean(sag)) + Number(Boolean(rpn));
  const validRows = (sag?.rows.length ?? 0) + (rpn?.rows.length ?? 0);
  const currentReady = currentMode === "single"
    ? Boolean(currentSingleFile)
    : SAG_PI_FAMILIES.every((family) => Boolean(currentFiles[family]));
  const rpnReady = rpnMode === "single"
    ? Boolean(rpnSingleFile)
    : SAG_PI_FAMILIES.every((family) => Boolean(rpnFiles[family]));
  const uploadFileCount = (currentMode === "single" ? 1 : 4) + (rpnMode === "single" ? 1 : 4);
  const allFilesSelected = currentReady && rpnReady;
  const unmappedCurrent = useMemo(() => (sag ? findUnmappedPis(sag.rows) : []), [sag]);
  const unmappedPrevious = useMemo(() => (rpn ? findUnmappedPis(rpn.rows) : []), [rpn]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setUploadProgress("");

    if (!allFilesSelected) {
      setError("Complete as duas fontes SAG. Cada uma pode usar 1 PDF integral ou 4 PDFs separados por E5/E6/E7/D8.");
      return;
    }

    const jobs = [
      ...(currentMode === "single"
        ? [{ source: "CURRENT" as const, family: "ALL" as const, file: currentSingleFile!, label: "Exercício Corrente · PDF integral" }]
        : SAG_PI_FAMILIES.map((family) => ({ source: "CURRENT" as const, family, file: currentFiles[family]!, label: `Exercício Corrente · ${family}` }))),
      ...(rpnMode === "single"
        ? [{ source: "RPNP" as const, family: "ALL" as const, file: rpnSingleFile!, label: "RPNP · PDF integral" }]
        : SAG_PI_FAMILIES.map((family) => ({ source: "RPNP" as const, family, file: rpnFiles[family]!, label: `RPNP · ${family}` }))),
    ];

    const oversized = jobs.find((job) => job.file.size > 4 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.label}: ${fileSize(oversized.file.size)}. Cada PDF precisa ficar abaixo de 4 MB para o envio seguro. Use o modo fracionado para essa fonte.`);
      return;
    }

    setUploading(true);
    const batchId = window.crypto.randomUUID();
    try {
      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index];
        setUploadProgress(`Processando ${index + 1}/${jobs.length} · ${job.label}`);
        const body = new FormData();
        body.set("batchId", batchId);
        body.set("source", job.source);
        body.set("family", job.family);
        body.set("file", job.file);

        const response = await fetch("/api/grupamento/sag/part", { method: "POST", body });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? `Falha em ${job.label}.`);
      }

      setUploadProgress("Consolidando as fontes no banco...");
      const finalize = await fetch("/api/grupamento/sag/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const payload = await finalize.json();
      if (!finalize.ok) throw new Error(payload.error ?? "Falha ao consolidar a carga SAG.");

      const parsed = payload as SagPairResponse;
      setSag(parsed.current);
      setRpn(parsed.rpn);
      window.dispatchEvent(new CustomEvent("mcl-grupamento-sag-updated"));
      window.dispatchEvent(new CustomEvent("mcl-grupamento-rpn-updated"));
      setNotice(`Carga consolidada · Exercício Corrente: ${currentMode === "single" ? "PDF integral" : "4 famílias"} · RPNP: ${rpnMode === "single" ? "PDF integral" : "4 famílias"} · ${parsed.current.rows.length + parsed.rpn.rows.length} linha(s) válidas.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na carga SAG.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function inspectLegacyRecovery() {
    setError("");
    setNotice("");

    const current = readStored<SagImportResult>(GROUP_STORAGE_KEYS.sag);
    const previous = readStored<RpnImportResult>(GROUP_STORAGE_KEYS.rpn);

    if (!current && !previous) {
      setLegacyPair(null);
      setError("Este navegador não contém uma carga SAG legada do CCOL.");
      return;
    }
    if (!current || !previous) {
      setLegacyPair(null);
      setError("Foi encontrada apenas uma das duas fontes SAG legadas. A recuperação não será feita com par incompleto.");
      return;
    }
    if (!Array.isArray(current.rows) || !current.rows.length || !Array.isArray(previous.rows) || !previous.rows.length) {
      setLegacyPair(null);
      setError("A carga local existe, mas não contém linhas válidas suficientes para recuperação.");
      return;
    }

    setLegacyPair({ current, rpn: previous });
  }

  async function confirmLegacyRecovery() {
    if (!legacyPair) return;

    setRecovering(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/grupamento/sag/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legacyPair),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao recuperar a carga SAG legada.");

      const recovered = payload as SagPairResponse;
      setSag(recovered.current);
      setRpn(recovered.rpn);
      setLegacyPair(null);
      window.dispatchEvent(new CustomEvent("mcl-grupamento-sag-updated"));
      window.dispatchEvent(new CustomEvent("mcl-grupamento-rpn-updated"));
      setNotice(`Carga SAG legada recuperada e persistida: ${recovered.current.rows.length} linha(s) do Exercício Corrente + ${recovered.rpn.rows.length} linha(s) dos créditos do exercício anterior. A cópia local foi preservada.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao recuperar a carga SAG legada.");
    } finally {
      setRecovering(false);
    }
  }

  function updateMonitor(id: number, patch: Partial<CcoMonitorConfig>) {
    setMonitors((current) => current.map((monitor) => (monitor.id === id ? { ...monitor, ...patch } : monitor)));
  }

  function toggleScreen(id: number, screen: CcoScreenId) {
    setMonitors((current) => current.map((monitor) => {
      if (monitor.id !== id) return monitor;
      const exists = monitor.screens.includes(screen);
      const screens = exists ? monitor.screens.filter((item) => item !== screen) : [...monitor.screens, screen];
      return { ...monitor, screens: screens.length ? screens : ["overview"] };
    }));
  }

  function resetMonitors() {
    setMonitors(defaultCcoMonitorConfig());
    setNotice("Configuração dos 8 monitores restaurada para o padrão do CCOL.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 text-slate-950 shadow-sm dark:border-sky-900/50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 dark:text-white dark:shadow-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              <span>Escalão / Grupamento Logístico</span>
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">CCOL</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Centro de Coordenação de Operações Logísticas</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Cockpit do escalão para consolidar o SAG, classificar por PI/Classe e distribuir quadros executivos em até oito monitores.</p>
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-white/70 px-3 py-2 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              Matriz PI/Classe incorporada: <strong className="text-slate-950 dark:text-white">{CCO_RULE_SOURCE.fileName}</strong> · {CCO_RULE_SOURCE.referenceDate} · {CCO_CLASS_SLIDES.length} quadros de Classe/finalidade
            </div>
          </div>
          <div className="grid min-w-[320px] grid-cols-3 gap-2 text-center text-xs">
            <Counter value="8" label="monitores" />
            <Counter value={`${sourceCount}/2`} label="fontes ativas" />
            <Counter value={String(validRows)} label="linhas válidas" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold"><Upload className="h-4 w-4" /> Carga SAG — arquitetura híbrida</div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Cada fonte pode entrar como 1 PDF integral ou 4 PDFs separados por E5, E6, E7 e D8. Use o fracionamento somente quando o SAG ou o tamanho do arquivo exigirem.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href="/docs/Cartilha_MCL_CCOL_SAG_v3.pdf"
                download
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50"
                title="Tutorial de apanha dos relatórios no SAG e importação no MCL"
              >
                <BookOpen className="h-4 w-4" />
                Guia de apanha no SAG
                <Download className="h-3.5 w-3.5" />
              </a>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Importação manual</span>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <HybridSourceGroup
              source="current"
              title="Exercício Corrente"
              description="Disponível, a liquidar, em liquidação, liquidado e pago."
              mode={currentMode}
              onMode={setCurrentMode}
              singleFile={currentSingleFile}
              onSingleFile={setCurrentSingleFile}
              files={currentFiles}
              onFile={(family, file) => setCurrentFiles((current) => ({ ...current, [family]: file }))}
            />
            <HybridSourceGroup
              source="rpn"
              title="RPNP / créditos do exercício anterior"
              description="Inscrito, a liquidar, liquidado e cancelado."
              mode={rpnMode}
              onMode={setRpnMode}
              singleFile={rpnSingleFile}
              onSingleFile={setRpnSingleFile}
              files={rpnFiles}
              onFile={(family, file) => setRpnFiles((current) => ({ ...current, [family]: file }))}
            />
            <button type="submit" disabled={uploading || !allFilesSelected} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {uploading ? (uploadProgress || "Processando a carga SAG...") : `Processar carga SAG (${uploadFileCount} arquivo${uploadFileCount > 1 ? "s" : ""})`}
            </button>
          </form>

          {!sag || !rpn ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200">Recuperação da carga anterior deste navegador</div>
              <p className="mt-1 text-[11px] leading-5 text-amber-900/80 dark:text-amber-300/80">
                Use somente no computador e perfil de navegador em que o par SAG foi carregado antes da persistência em banco. O MCL apenas lê o snapshot local; nenhuma fonte TG é consultada.
              </p>
              {!legacyPair ? (
                <button type="button" onClick={inspectLegacyRecovery} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-zinc-950 dark:text-amber-200 dark:hover:bg-amber-950/40">
                  <RefreshCw className="h-4 w-4" /> Recuperar última carga SAG deste navegador
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-amber-200 bg-white/80 p-3 dark:border-amber-900/50 dark:bg-zinc-950">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Exercício Corrente</div>
                      <div className="mt-1 break-all text-xs font-semibold">{legacyPair.current.source.fileName}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">{dateTime(legacyPair.current.source.importedAt)} · {legacyPair.current.rows.length} linha(s)</div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white/80 p-3 dark:border-amber-900/50 dark:bg-zinc-950">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Créditos do exercício anterior</div>
                      <div className="mt-1 break-all text-xs font-semibold">{legacyPair.rpn.source.fileName}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">{dateTime(legacyPair.rpn.source.importedAt)} · {legacyPair.rpn.rows.length} linha(s)</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={recovering} onClick={() => { void confirmLegacyRecovery(); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
                      {recovering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {recovering ? "Persistindo recuperação..." : "Confirmar recuperação no banco"}
                    </button>
                    <button type="button" disabled={recovering} onClick={() => setLegacyPair(null)} className="rounded-lg border border-zinc-300 px-3 py-2.5 text-xs font-semibold dark:border-zinc-700">Cancelar</button>
                  </div>
                  <p className="text-[10px] leading-4 text-zinc-500">A recuperação é registrada como LEGACY_BROWSER_RECOVERY. O PDF não é relido e a cópia local não é apagada.</p>
                </div>
              )}
            </div>
          ) : null}

          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
          {notice ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p> : null}

          <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Cada fonte pode ser integral ou fracionada. O MCL valida o modo escolhido e consolida sempre em duas fontes lógicas; nenhum número sintético substitui arquivo ausente.</p>
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0" /> A classificação usa PI exato conforme a matriz fornecida; PI não mapeado permanece explicitamente fora da Classe.</p>
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Novas cargas são persistidas no banco com checksum. Snapshots locais legados só entram por recuperação explícita e auditada.</p>
            <p className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Escopo de sessão: {organizationId || "organização não informada"}.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4" /> Situação orçamentária consolidada</div>
          {sag && rpn ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Exercício Corrente</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Crédito recebido" value={currency(sag.totals.total)} />
                <Metric label="Disponível" value={currency(sag.totals.available)} />
                <Metric label="Empenhado" value={percent(sag.totals.committedPercent)} />
                <Metric label="Liquidado" value={percent(sag.totals.liquidatedPercent)} />
              </div>
              <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Créditos do exercício anterior</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Total inscrito" value={currency(rpn.totals.inscribed)} />
                  <Metric label="A liquidar" value={currency(rpn.totals.toLiquidate)} />
                  <Metric label="% liquidado" value={percent(rpn.totals.liquidatedPercent)} />
                  <Metric label="% cancelado" value={percent(rpn.totals.cancelledPercent)} />
                </div>
              </div>
              {(unmappedCurrent.length || unmappedPrevious.length) ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  PI não mapeados: {unmappedCurrent.length} no Exercício Corrente · {unmappedPrevious.length} nos créditos anteriores. Esses valores não são atribuídos silenciosamente às Classes.
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-900">Exercício: {sag.source.fileName}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-900">Créditos anteriores: {rpn.source.fileName}</span>
              </div>
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="max-w-sm p-6"><FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-zinc-400" /><p className="font-semibold">Par SAG ainda não carregado</p><p className="mt-1 text-xs leading-5 text-zinc-500">Carregue as duas fontes para liberar os indicadores.</p></div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="flex items-center gap-2 text-sm font-bold"><MonitorCog className="h-4 w-4" /> Matriz de distribuição — 8 monitores</div><p className="mt-1 text-xs text-zinc-500">Cada saída escolhe telas, loop, intervalo e layout MCL ou padrão CCOL.</p></div>
          <button type="button" onClick={resetMonitors} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">Restaurar padrão</button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {monitors.map((monitor) => (
            <article key={monitor.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-4">
                <div><div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">HDMI / SAÍDA {String(monitor.id).padStart(2, "0")}</div><div className="mt-1 font-bold">{monitor.label}</div></div>
                <a href={`/grupamento/monitor/${monitor.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">Abrir <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Field label="Estado"><select value={monitor.enabled ? "on" : "off"} onChange={(e) => updateMonitor(monitor.id, { enabled: e.target.value === "on" })} className="w-full rounded-lg border border-zinc-200 bg-transparent px-2 py-2 text-xs dark:border-zinc-800"><option value="on">Ativo</option><option value="off">Desativado</option></select></Field>
                <Field label="Modo"><select value={monitor.mode} onChange={(e) => updateMonitor(monitor.id, { mode: e.target.value as "single" | "loop" })} className="w-full rounded-lg border border-zinc-200 bg-transparent px-2 py-2 text-xs dark:border-zinc-800"><option value="single">Tela fixa</option><option value="loop">Loop</option></select></Field>
                <Field label="Delay"><input type="number" min={5} max={300} value={monitor.delaySeconds} onChange={(e) => updateMonitor(monitor.id, { delaySeconds: Math.max(5, Number(e.target.value) || CCO_DEFAULT_LOOP_DELAY_SECONDS) })} className="w-full rounded-lg border border-zinc-200 bg-transparent px-2 py-2 text-xs dark:border-zinc-800" /></Field>
                <Field label="Layout"><select value={monitor.layout} onChange={(e) => updateMonitor(monitor.id, { layout: e.target.value as "mcl" | "ccol" })} className="w-full rounded-lg border border-zinc-200 bg-transparent px-2 py-2 text-xs dark:border-zinc-800"><option value="mcl">MCL</option><option value="ccol">Padrão CCOL</option></select></Field>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CCO_SCREEN_CATALOG.map((screen) => {
                  const selected = monitor.screens.includes(screen.id);
                  return <button key={screen.id} type="button" onClick={() => toggleScreen(monitor.id, screen.id)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition ${selected ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-300" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"}`}>{selected ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}{screen.label}</button>;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function HybridSourceGroup({
  source,
  title,
  description,
  mode,
  onMode,
  singleFile,
  onSingleFile,
  files,
  onFile,
}: {
  source: "current" | "rpn";
  title: string;
  description: string;
  mode: SagUploadMode;
  onMode: (mode: SagUploadMode) => void;
  singleFile: File | null;
  onSingleFile: (file: File | null) => void;
  files: Record<SagPiFamily, File | null>;
  onFile: (family: SagPiFamily, file: File | null) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="mt-0.5 text-[11px] text-zinc-500">{description}</div>
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onMode("single")}
            className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${mode === "single" ? "bg-sky-600 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
          >
            PDF único
          </button>
          <button
            type="button"
            onClick={() => onMode("family")}
            className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${mode === "family" ? "bg-sky-600 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
          >
            Por família
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <div className="mt-3">
          <SourcePicker
            id={`${source}-all`}
            step="ALL"
            title="PDF integral"
            description="Arquivo único contendo os PI E5, E6, E7 e D8."
            file={singleFile}
            onFile={onSingleFile}
          />
          <p className="mt-2 text-[10px] leading-4 text-zinc-500">Se o SAG travar ou o PDF ultrapassar 4 MB, troque esta fonte para “Por família”.</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SAG_PI_FAMILIES.map((family) => (
            <SourcePicker
              key={family}
              id={familyFieldName(source, family)}
              step={family}
              title={`Família ${family}`}
              description="PDF separado desta família de PI."
              file={files[family]}
              onFile={(file) => onFile(family, file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SourcePicker({ id, step, title, description, file, onFile }: { id: string; step: string; title: string; description: string; file: File | null; onFile: (file: File | null) => void }) {
  return (
    <div className={`rounded-xl border p-3 ${file ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/10" : "border-zinc-200 dark:border-zinc-800"}`}>
      <div className="flex items-start gap-3"><span className="rounded-lg bg-zinc-950 px-2 py-1.5 font-mono text-[10px] font-bold text-white dark:bg-white dark:text-zinc-950">{step}</span><div className="min-w-0 flex-1"><div className="text-sm font-bold">{title}</div><div className="mt-0.5 text-[11px] text-zinc-500">{description}</div>{file ? <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /><span className="truncate">{file.name}</span><span className="font-normal text-zinc-500">· {fileSize(file.size)}</span></div> : null}</div></div>
      <label htmlFor={id} className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"><Upload className="h-4 w-4" />{file ? "Trocar arquivo" : "Selecionar PDF do SAG"}</label>
      <input id={id} type="file" accept={SOURCE_ACCEPT} className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
    </div>
  );
}

function Counter({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-sky-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"><div className="text-2xl font-black">{value}</div><div className="text-slate-500 dark:text-slate-400">{label}</div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-1 text-base font-black">{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>{children}</label>;
}
