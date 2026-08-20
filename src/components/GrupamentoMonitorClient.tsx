"use client";

import { useEffect, useState } from "react";
import { Clock3, Database, Monitor, ShieldCheck } from "lucide-react";
import { GrupamentoBaseMonitorScreen } from "@/components/GrupamentoBaseMonitorScreen";
import { GrupamentoRuleMonitorScreen } from "@/components/GrupamentoRuleMonitorScreen";
import { CCO_RULE_SOURCE } from "@/modules/grupamento/cco";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
  CCO_SCREEN_CATALOG,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  type CcoMonitorConfig,
} from "@/modules/grupamento/monitor";

function load<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function GrupamentoMonitorClient({ monitorId }: { monitorId: number }) {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [rpn, setRpn] = useState<RpnImportResult | null>(null);
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const hydrate = () => {
      setSag(load<SagImportResult>(GROUP_STORAGE_KEYS.sag));
      setRpn(load<RpnImportResult>(GROUP_STORAGE_KEYS.rpn));
      const stored = load<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors);
      const selected = stored?.find((item) => item.id === monitorId);
      if (selected) setMonitor({ ...selected, layout: selected.layout ?? "mcl" });
    };
    const frame = window.requestAnimationFrame(hydrate);
    window.addEventListener("storage", hydrate);
    window.addEventListener("mcl-grupamento-sag-updated", hydrate);
    window.addEventListener("mcl-grupamento-rpn-updated", hydrate);
    window.addEventListener("mcl-grupamento-monitors-updated", hydrate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", hydrate);
      window.removeEventListener("mcl-grupamento-sag-updated", hydrate);
      window.removeEventListener("mcl-grupamento-rpn-updated", hydrate);
      window.removeEventListener("mcl-grupamento-monitors-updated", hydrate);
    };
  }, [monitorId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setScreenIndex(0);
  }, [monitor.screens]);

  useEffect(() => {
    if (monitor.mode !== "loop" || monitor.screens.length <= 1) return;
    const timer = window.setInterval(
      () => setScreenIndex((current) => (current + 1) % monitor.screens.length),
      Math.max(5, monitor.delaySeconds) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [monitor.mode, monitor.screens, monitor.delaySeconds]);

  const activeScreen = monitor.screens[Math.min(screenIndex, monitor.screens.length - 1)] ?? "overview";
  const screenLabel = CCO_SCREEN_CATALOG.find((item) => item.id === activeScreen)?.label ?? "Visão executiva";
  const ccol = monitor.layout === "ccol";
  const isRuleScreen = activeScreen === "briefing" || activeScreen.startsWith("class-");

  return (
    <main className={`min-h-screen pb-14 ${ccol ? "bg-[#f7f8fa] text-slate-950" : "bg-slate-950 text-white"}`}>
      <header className={`flex min-h-20 items-center justify-between gap-5 border-b px-8 py-4 ${ccol ? "border-slate-300 bg-white" : "border-white/10 bg-slate-950/90"}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${ccol ? "border-sky-800/20 bg-sky-900 text-white" : "border-sky-400/20 bg-sky-400/10 text-sky-300"}`}>
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-[0.2em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>MCL · Escalão / Grupamento Logístico</div>
            <div className="mt-1 text-xl font-black">{monitor.label} · {screenLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <div className="text-lg font-mono font-bold">{now.toLocaleTimeString("pt-BR")}</div>
            <div className={ccol ? "text-xs text-slate-500" : "text-xs text-slate-400"}>{now.toLocaleDateString("pt-BR")}</div>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${monitor.enabled ? (ccol ? "bg-emerald-100 text-emerald-800" : "bg-emerald-400/10 text-emerald-300") : (ccol ? "bg-amber-100 text-amber-800" : "bg-amber-400/10 text-amber-300")}`}>
            {monitor.enabled ? "Saída ativa" : "Saída desativada"}
          </div>
        </div>
      </header>

      {ccol ? (
        <div className="border-b-4 border-sky-900 bg-slate-100 px-8 py-2 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-sky-950">
          Prontidão Logística · na defesa e preservação da fronteira oeste
        </div>
      ) : null}

      <section className="p-8">
        {!monitor.enabled ? (
          <Empty ccol={ccol} title="Monitor desativado" description="Ative esta saída na matriz do CCO para voltar a exibir conteúdo." />
        ) : !sag || !rpn ? (
          <Empty ccol={ccol} title="Par SAG incompleto" description="Esta tela exige Exercício Corrente e créditos do exercício anterior validados. Não há substituição por números sintéticos." />
        ) : isRuleScreen ? (
          <GrupamentoRuleMonitorScreen screen={activeScreen} sag={sag} rpn={rpn} layout={monitor.layout} />
        ) : (
          <GrupamentoBaseMonitorScreen screen={activeScreen} sag={sag} rpn={rpn} layout={monitor.layout} />
        )}
      </section>

      <footer className={`fixed inset-x-0 bottom-0 flex items-center justify-between border-t px-8 py-3 text-xs ${ccol ? "border-slate-300 bg-white text-slate-600" : "border-white/10 bg-slate-950/95 text-slate-400"}`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex min-w-0 items-center gap-1.5"><Database className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Fonte: {sag && rpn ? `${sag.source.fileName} + ${rpn.source.fileName}` : "par incompleto"}</span></span>
          <span className="hidden items-center gap-1.5 xl:flex"><ShieldCheck className="h-3.5 w-3.5" /> Matriz PI/Classe: {CCO_RULE_SOURCE.fileName} · {CCO_RULE_SOURCE.referenceDate}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{monitor.layout === "ccol" ? "layout CCOL" : "layout MCL"}</span>
          <span>{monitor.mode === "loop" ? `loop · ${monitor.delaySeconds}s` : "tela fixa"}</span>
          <span>{screenIndex + 1}/{monitor.screens.length}</span>
        </div>
      </footer>
    </main>
  );
}

function Empty({ ccol, title, description }: { ccol: boolean; title: string; description: string }) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-lg text-center">
        <Clock3 className={`mx-auto h-10 w-10 ${ccol ? "text-slate-400" : "text-slate-600"}`} />
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className={`mt-3 leading-6 ${ccol ? "text-slate-600" : "text-slate-400"}`}>{description}</p>
      </div>
    </div>
  );
}
