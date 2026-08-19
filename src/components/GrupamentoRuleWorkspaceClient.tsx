"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCog, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { classifySagRows } from "@/modules/grupamento/classification";
import { GROUP_STORAGE_KEYS } from "@/modules/grupamento/monitor";
import type { SagRuleSet } from "@/modules/grupamento/rules";
import type { SagImportResult } from "@/modules/grupamento/sag";

function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function GrupamentoRuleWorkspaceClient() {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [rules, setRules] = useState<SagRuleSet | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const hydrate = () => {
      setSag(readStored<SagImportResult>(GROUP_STORAGE_KEYS.sag));
      setRules(readStored<SagRuleSet>(GROUP_STORAGE_KEYS.rules));
    };
    const frame = window.requestAnimationFrame(hydrate);
    window.addEventListener("storage", hydrate);
    window.addEventListener("mcl-grupamento-sag-updated", hydrate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", hydrate);
      window.removeEventListener("mcl-grupamento-sag-updated", hydrate);
    };
  }, []);

  const classification = useMemo(() => (sag && rules ? classifySagRows(sag.rows, rules) : null), [sag, rules]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const input = form.elements.namedItem("rulesFile") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Selecione a planilha que contém a tabela Classes / PI.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/grupamento/regras", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha na matriz de regras.");

      const parsed = payload as SagRuleSet;
      setRules(parsed);
      window.localStorage.setItem(GROUP_STORAGE_KEYS.rules, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent("mcl-grupamento-rules-updated"));
      setNotice(`${parsed.groups.length} grupo(s) de Classe/PI e ${parsed.briefingRules.length} definição(ões) de briefing reconhecidos.`);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na matriz de regras.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold"><FileCog className="h-4 w-4" /> Matriz determinística Classes / PI</div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Carregue a planilha de regras. O MCL lê a tabela Classes/PI e as definições de slides sem publicar os códigos no repositório.</p>
            </div>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800 dark:bg-violet-950/50 dark:text-violet-300">Regra importada</span>
          </div>

          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <input name="rulesFile" type="file" accept=".xls,.xlsx" className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900" />
            <button type="submit" disabled={uploading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Interpretando regras..." : "Carregar matriz de regras"}
            </button>
          </form>

          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
          {notice ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p> : null}

          {rules ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Info label="Grupos" value={String(rules.groups.length)} />
              <Info label="Pendentes" value={String(rules.groups.filter((group) => group.status === "PENDENTE").length)} />
              <Info label="Conflitos PI" value={String(rules.conflicts.length)} />
              <Info label="Briefings" value={String(rules.briefingRules.length)} />
            </div>
          ) : null}

          <div className="mt-4 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800">
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Classificação somente por código PI exato. `NOME_PI` não é usado para adivinhar código ausente.</p>
            {rules ? <p className="mt-2">Fonte: {rules.source.fileName} · {new Date(rules.source.importedAt).toLocaleString("pt-BR")}</p> : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-bold">Execução por Classe</div>
          {!rules ? (
            <Empty text="Carregue a matriz de regras para habilitar a classificação por Classe." />
          ) : !sag ? (
            <Empty text="Matriz carregada. Falta uma carga SAG para aplicar as regras." />
          ) : classification ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classification.classes.map((item) => (
                  <div key={item.className} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Classe {item.className}</div>
                    <div className="mt-2 text-xl font-black">{percent(item.snapshot.committedPercent)}</div>
                    <div className="mt-1 text-xs text-zinc-500">{currency(item.snapshot.total)} · {item.matchedRowCount} linha(s)</div>
                  </div>
                ))}
                {!classification.classes.length ? <div className="col-span-full"><Empty text="Nenhum PI da carga SAG corresponde à matriz importada." /></div> : null}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Info label="Sem código PI" value={String(classification.rowsWithoutPiCode)} />
                <Info label="PI sem regra" value={String(classification.unclassifiedRows)} />
                <Info label="Linhas em conflito" value={String(classification.conflictedRows)} />
              </div>

              {classification.warnings.length ? (
                <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  <summary className="flex cursor-pointer items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Alertas de regra/classificação ({classification.warnings.length})</summary>
                  <ul className="mt-3 list-disc space-y-1 pl-5">{classification.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"><div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-1 text-lg font-black">{value}</div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-4 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">{text}</div>;
}
