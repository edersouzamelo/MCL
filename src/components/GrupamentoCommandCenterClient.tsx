"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileUp,
  MonitorCog,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
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
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [rpnFile, setRpnFile] = useState<File | null>(null);
  const [monitors, setMonitors] = useState<CcoMonitorConfig[]>(defaultCcoMonitorConfig());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedSag = readStored<SagImportResult>(GROUP_STORAGE_KEYS.sag);
      const storedRpn = readStored<RpnImportResult>(GROUP_STORAGE_KEYS.rpn);
      const storedMonitors = readStored<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors);
      if (storedSag) setSag(storedSag);
      if (storedRpn) setRpn(storedRpn);
      if (storedMonitors?.length === 8) setMonitors(storedMonitors);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GROUP_STORAGE_KEYS.monitors, JSON.stringify(monitors));
  }, [monitors]);

  const topPis = useMemo(() => sag?.byPi.slice(0, 5) ?? [], [sag]);
  const topUgs = useMemo(() => sag?.byUg.slice(0, 5) ?? [], [sag]);
  const sourceCount = Number(Boolean(sag)) + Number(Boolean(rpn));
  const validRows = (sag?.rows.length ?? 0) + (rpn?.rows.length ?? 0);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!currentFile || !rpnFile) {
      setError("Selecione os dois relatórios: Exercício Corrente e RPNP.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.set("currentFile", currentFile);
      body.set("rpnFile", rpnFile);
      const response = await fetch("/api/grupamento/sag", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha na carga SAG.");

      const parsed = payload as SagPairResponse;
      setSag(parsed.current);
      setRpn(parsed.rpn);
      window.localStorage.setItem(GROUP_STORAGE_KEYS.sag, JSON.stringify(parsed.current));
      window.localStorage.setItem(GROUP_STORAGE_KEYS.rpn, JSON.stringify(parsed.rpn));
      window.dispatchEvent(new CustomEvent("mcl-grupamento-sag-updated"));
      window.dispatchEvent(new CustomEvent("mcl-grupamento-rpn-updated"));
      setNotice(
        `Par validado: ${parsed.current.rows.length} linha(s) do Exercício Corrente + ${parsed.rpn.rows.length} linha(s) de RPNP. Os arquivos brutos não foram persistidos.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na carga SAG.");
    } finally {
      setUploading(false);
    }
  }

  function updateMonitor(id: number, patch: Partial<CcoMonitorConfig>) {
    setMonitors((current) => current.map((monitor) => (monitor.id === id ? { ...monitor, ...patch } : monitor)));
  }

  function toggleScreen(id: number, screen: CcoScreenId) {
    setMonitors((current) =>
      current.map((monitor) => {
        if (monitor.id !== id) return monitor;
        const exists = monitor.screens.includes(screen);
        const screens = exists ? monitor.screens.filter((item) => item !== screen) : [...monitor.screens, screen];
        return { ...monitor, screens: screens.length ? screens : ["overview"] };
      }),
    );
  }

  function resetMonitors() {
    setMonitors(defaultCcoMonitorConfig());
    setNotice("Configuração dos 8 monitores restaurada para o padrão do CCO.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-xl dark:border-sky-900/50">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              <span>Escalão / Grupamento Logístico</span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-300">CCO</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Centro de Consciência Logística</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Visão executiva do escalão para distribuição contínua em até oito monitores. A carga operacional é formada por duas fontes SAG: Exercício Corrente e RPNP.
            </p>
          </div>
          <div className="grid min-w-[320px] grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl font-black">8</div>
              <div className="text-slate-400">monitores</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl font-black">{sourceCount}/2</div>
              <div className="text-slate-400">fontes ativas</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl font-black">{validRows}</div>
              <div className="text-slate-400">linhas válidas</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                <Upload className="h-4 w-4" /> Carga SAG — duas fontes
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">PDF é o formato recomendado. XLS/XLSX permanecem aceitos como alternativa. Limite de 20 MB por arquivo.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              Importação manual
            </span>
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
            <SourcePicker
              id="sag-current-file"
              step="01"
              title="Exercício Corrente"
              description="Execução do exercício: disponível, a liquidar, em liquidação, liquidado e pago."
              file={currentFile}
              onFile={setCurrentFile}
            />
            <SourcePicker
              id="sag-rpn-file"
              step="02"
              title="RPNP / Restos a Pagar"
              description="Recursos remanescentes de ano anterior: inscrito, a liquidar, liquidado e cancelado."
              file={rpnFile}
              onFile={setRpnFile}
            />

            <button
              type="submit"
              disabled={uploading || !currentFile || !rpnFile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
            >
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {uploading ? "Interpretando os dois relatórios..." : "Processar os 2 relatórios"}
            </button>
          </form>

          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
          {notice ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p> : null}

          <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Os dois relatórios são validados como um par. Se um deles falhar, a nova carga inteira é recusada.</p>
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0" /> PDF é lido pela posição das colunas; não há OCR nem inferência de valores ausentes.</p>
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
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">RPNP / Restos a Pagar</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Total inscrito" value={currency(rpn.totals.inscribed)} />
                  <Metric label="A liquidar" value={currency(rpn.totals.toLiquidate)} />
                  <Metric label="% liquidado" value={percent(rpn.totals.liquidatedPercent)} />
                  <Metric label="% cancelado" value={percent(rpn.totals.cancelledPercent)} />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Ranking title="Principais PI — exercício" rows={topPis.map((item) => ({ key: item.pi, label: item.piName || item.pi, value: percent(item.snapshot.committedPercent) }))} />
                <Ranking title="Principais UG — exercício" rows={topUgs.map((item) => ({ key: item.ug, label: item.acronym || item.ug, value: percent(item.snapshot.committedPercent) }))} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-900">Exercício: {sag.source.fileName}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-900">RPNP: {rpn.source.fileName}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-900">Natureza: DADO IMPORTADO</span>
              </div>
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="max-w-sm p-6">
                <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                <p className="font-semibold">Par SAG ainda não carregado</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">O painel só libera os indicadores quando Exercício Corrente e RPNP forem reconhecidos juntos. Não há preenchimento sintético.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold"><MonitorCog className="h-4 w-4" /> Matriz de distribuição — 8 monitores</div>
            <p className="mt-1 text-xs text-zinc-500">Cada saída pode ficar fixa ou alternar mini-telas em loop com intervalo próprio.</p>
          </div>
          <button onClick={resetMonitors} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">Restaurar padrão</button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {monitors.map((monitor) => (
            <article key={monitor.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-zinc-500">HDMI / SAÍDA {String(monitor.id).padStart(2, "0")}</div>
                  <input
                    value={monitor.label}
                    onChange={(event) => updateMonitor(monitor.id, { label: event.target.value })}
                    className="mt-1 w-full bg-transparent text-base font-bold outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`/grupamento/monitor/${monitor.id}`, `_blank`, "noopener,noreferrer")}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950"
                >
                  Abrir <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_100px]">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Modo
                  <select
                    value={monitor.mode}
                    onChange={(event) => updateMonitor(monitor.id, { mode: event.target.value as "single" | "loop" })}
                    className="mt-1 block w-full rounded-lg border border-zinc-200 bg-transparent p-2 dark:border-zinc-800"
                  >
                    <option value="single">Tela fixa</option>
                    <option value="loop">Loop</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Delay
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={monitor.delaySeconds}
                    onChange={(event) => updateMonitor(monitor.id, { delaySeconds: Math.max(5, Number(event.target.value) || 15) })}
                    className="mt-1 block w-full rounded-lg border border-zinc-200 bg-transparent p-2 dark:border-zinc-800"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <input type="checkbox" checked={monitor.enabled} onChange={(event) => updateMonitor(monitor.id, { enabled: event.target.checked })} /> Ativo
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CCO_SCREEN_CATALOG.map((screen) => {
                  const active = monitor.screens.includes(screen.id);
                  return (
                    <button
                      key={screen.id}
                      type="button"
                      onClick={() => toggleScreen(monitor.id, screen.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${active ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"}`}
                    >
                      {screen.label}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
        <strong>Regra institucional preservada:</strong> a classificação por Classe continua dependente da matriz PI → Classe importada. PI ausente ou conflitante permanece pendente; o MCL não resolve por semelhança.
      </section>
    </div>
  );
}

function SourcePicker({
  id,
  step,
  title,
  description,
  file,
  onFile,
}: {
  id: string;
  step: string;
  title: string;
  description: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className={`rounded-xl border-2 p-3 transition ${file ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-xs font-bold text-white dark:bg-white dark:text-zinc-950">{step}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{title}</div>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{description}</p>
          {file ? (
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate" title={file.name}>{file.name}</span>
              <span className="shrink-0 font-normal text-zinc-500">· {fileSize(file.size)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <input
        id={id}
        type="file"
        accept={SOURCE_ACCEPT}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-800 shadow-sm transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70"
      >
        <FileUp className="h-4 w-4" />
        {file ? "Trocar arquivo" : "Selecionar PDF do SAG"}
      </label>
      <div className="mt-1.5 text-center text-[10px] text-zinc-500">PDF recomendado · XLS/XLSX aceitos</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function Ranking({ title, rows }: { title: string; rows: Array<{ key: string; label: string; value: string }> }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">{title}</div>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium" title={row.label}>{row.label}</span>
              <span className="font-mono font-bold">{row.value}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-zinc-500">Sem detalhamento nesta carga.</p>}
    </div>
  );
}
