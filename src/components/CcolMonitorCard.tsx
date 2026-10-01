"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { FileSpreadsheet, Presentation, Settings, X } from "lucide-react";
import type { CcoMonitorConfig } from "@/modules/grupamento/monitor";
import "./ccol-monitor-card.css";

const covers: Record<number, string> = { 1: "class-i", 2: "class-ii", 3: "class-iii", 4: "class-v", 5: "class-v", 6: "class-ix", 7: "class-viii", 8: "transport", 10: "planning" };

export function MonitorCommandHelp({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  const id = useId();
  return <div className={`ccol-command-help ${className}`} aria-describedby={id}>{children}<span id={id} role="tooltip" className="ccol-command-tooltip">{text}</span></div>;
}

export function AnimatedMonitorSection({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  return <div id={id} className={`ccol-animated-section ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}><div className="ccol-animated-inner">{children}</div></div>;
}

export function CcolMonitorCard({ monitor, configuration, budget, documents, exports, devices }: {
  monitor: CcoMonitorConfig;
  configuration: ReactNode;
  budget: ReactNode;
  documents: (open: boolean) => ReactNode;
  exports: ReactNode;
  devices: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [section, setSection] = useState<"configuration" | "budget" | "documents" | null>(null);
  const titleId = useId();
  const sectionId = useId();
  function toggle(next: typeof section) { setSection((current) => current === next ? null : next); }
  function close() { dialog.current?.close(); }
  return <article className={monitor.id === 10 ? "sm:col-span-2" : ""}>
    <h3 className="mb-2 text-center text-sm font-bold">{monitor.label}</h3>
    <button type="button" aria-haspopup="dialog" aria-label={`Configurar ${monitor.label}`} className="ccol-monitor-trigger" onClick={() => { setOpened(true); dialog.current?.showModal(); }}>
      <span className="ccol-monitor-bezel">
        <span className="ccol-monitor-screen">
          {covers[monitor.id] ? <img src={`/ccol-covers/${covers[monitor.id]}.webp`} alt={monitor.id === 10 ? "Seção de Planejamento e Coordenação" : `Capa do ${monitor.label}`} /> : <span className="ccol-test-screen">TESTE</span>}
          {monitor.id === 10 ? <><span className="ccol-monitor-divider horizontal" /><span className="ccol-monitor-divider vertical" /></> : null}
        </span>
        <span className={`ccol-monitor-led ${monitor.enabled ? "enabled" : ""}`} />
      </span>
      <span className="ccol-monitor-stand" />
      <span className="ccol-monitor-foot" />
    </button>
    <dialog ref={dialog} aria-labelledby={titleId} className="ccol-monitor-dialog" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="ccol-monitor-dialog-panel">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div><h2 id={titleId} className="text-xl font-bold">{monitor.label}</h2><p className="mt-1 text-xs text-zinc-500">{monitor.id === 9 ? "Teste independente dos monitores em exposição" : monitor.id === 10 ? "Painel central composto por quatro telas" : `HDMI / Saída ${String(monitor.id).padStart(2, "0")}`}</p></div>
          <button type="button" onClick={close} aria-label="Fechar comandos do monitor" className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </header>
        <p className="my-4 text-sm"><span className="font-semibold">Atualizado por: </span>{monitor.updatedAt ? <>{monitor.updatedByName} <span className="text-zinc-500">· {new Date(monitor.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande", dateStyle: "short", timeStyle: "medium" })}</span></> : <span className="text-zinc-500">Sem atualização registrada</span>}</p>
        <div className="grid grid-cols-3 gap-2">
          <MonitorCommandHelp text="Define classe ou seção responsável, estado, modo, intervalo entre telas e layout."><button type="button" className="ccol-command ccol-command-outline" aria-expanded={section === "configuration"} aria-controls={`${sectionId}-configuration`} onClick={() => toggle("configuration")}><Settings className="h-4 w-4" /> Configurar</button></MonitorCommandHelp>
          <MonitorCommandHelp text="Seleciona os quadros do SAG que compõem a apresentação deste monitor."><button type="button" className="ccol-command ccol-command-outline" aria-expanded={section === "budget"} aria-controls={`${sectionId}-budget`} onClick={() => toggle("budget")}><FileSpreadsheet className="h-4 w-4" /> Incluir conteúdo orçamentário</button></MonitorCommandHelp>
          <MonitorCommandHelp text="Importa PDF, PowerPoint ou Word, permite revisar e aprovar o conteúdo para exibição."><button type="button" className="ccol-command ccol-command-outline" aria-expanded={section === "documents"} aria-controls={`${sectionId}-documents`} onClick={() => toggle("documents")}><Presentation className="h-4 w-4" /> Incluir conteúdo documental</button></MonitorCommandHelp>
        </div>
        <div className="mt-2">{exports}</div>

        <AnimatedMonitorSection open={section === "configuration"} id={`${sectionId}-configuration`}><div className="ccol-subcommands">{configuration}{devices}</div></AnimatedMonitorSection>
        <AnimatedMonitorSection open={section === "budget"} id={`${sectionId}-budget`}><div className="ccol-subcommands">{budget}</div></AnimatedMonitorSection>
        <div id={`${sectionId}-documents`}>{opened ? documents(section === "documents") : null}</div>
      </div>
    </dialog>
  </article>;
}
