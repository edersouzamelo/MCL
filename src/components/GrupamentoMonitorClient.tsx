"use client";

import { useEffect, useState } from "react";
import { Clock3, Database, Monitor, ShieldCheck } from "lucide-react";
import { GrupamentoBaseMonitorScreen } from "@/components/GrupamentoBaseMonitorScreen";
import { GrupamentoRuleMonitorScreen } from "@/components/GrupamentoRuleMonitorScreen";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
  CCO_SCREEN_CATALOG,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  type CcoMonitorConfig,
  type CcoScreenId,
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
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const hydrate = () => {
      setSag(load<SagImportResult>(GROUP_STORAGE_KEYS.sag));
      const stored = load<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors);
      const selected = stored?.find((item) => item.id === monitorId);
      if (selected) setMonitor(selected);
    };
    const frame = window.requestAnimationFrame(hydrate);
    window.addEventListener("storage", hydrate);
    window.addEventListener("mcl-grupamento-sag-updated", hydrate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", hydrate);
      window.removeEventListener("mcl-grupamento-sag-updated", hydrate);
    };
  }, [monitorId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-950 pb-14 text-white">
      <header className="flex min-h-20 items-center justify-between gap-5 border-b border-white/10 bg-slate-950/90 px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10"><Monitor className="h-6 w-6 text-sky-300" /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">MCL · Escalão / Grupamento Logístico</div>
            <div className="mt-1 text-xl font-black">{monitor.label} · {screenLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <div className="text-lg font-mono font-bold">{now.toLocaleTimeString("pt-BR")}</div>
            <div className="text-xs text-slate-400">{now.toLocaleDateString("pt-BR")}</div>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${monitor.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
            {monitor.enabled ? "Saída ativa" : "Saída desativada"}
          </div>
        </div>
      </header>

      <section className="p-8">
        {!monitor.enabled ? (
          <Empty title="Monitor desativado" description="Ative esta saída na matriz do CCO para voltar a exibir conteúdo." />
        ) : !sag ? (
          <Empty title="Nenhuma carga SAG ativa" description="Esta tela não usa números sintéticos. Carregue um export SAG no cockpit do Grupamento." />
        ) : activeScreen === "classes" || activeScreen === "briefing" ? (
          <GrupamentoRuleMonitorScreen screen={activeScreen} sag={sag} />
        ) : (
          <GrupamentoBaseMonitorScreen screen={activeScreen} sag={sag} />
        )}
      </section>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-slate-950/95 px-8 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> {sag ? `Fonte: ${sag.source.fileName}` : "Fonte: sem carga"}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> cálculo determinístico</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{monitor.mode === "loop" ? `loop · ${monitor.delaySeconds}s` : "tela fixa"}</span>
          <span>{screenIndex + 1}/{monitor.screens.length}</span>
        </div>
      </footer>
    </main>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-lg text-center">
        <Clock3 className="mx-auto h-10 w-10 text-slate-600" />
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className="mt-3 leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}
