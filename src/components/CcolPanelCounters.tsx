"use client";
import { useId, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Info, X } from "lucide-react";
import { monitorUpdateAge, monitorFreshness, monitorUpdateTime } from "@/modules/grupamento/monitor-freshness";
import type { CcoMonitorConfig } from "@/modules/grupamento/monitor";

function CounterPopover({ value, label, title, children, scoreboard = false }: { value: string; label: string; title: string; children: ReactNode; scoreboard?: boolean }) {
  const id = useId(), popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [position, setPosition] = useState<CSSProperties>({});
  function positionPopup(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect(), width = Math.min(scoreboard ? 620 : 340, window.innerWidth - 24);
    setPosition({ position: "fixed", inset: "auto", margin: 0, width, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - Math.min(window.innerHeight * .7, scoreboard ? 780 : 210) - 12)) });
  }
  return <>
    <button type="button" popoverTarget={id} onClick={event => positionPopup(event.currentTarget)} aria-expanded={open} aria-controls={id} aria-label={`${value} ${label}: ${scoreboard ? "ver placar de atualizações" : "ver explicação"}`} title={title}
      onMouseEnter={scoreboard ? undefined : event => { positionPopup(event.currentTarget); if (!popup.current?.matches(":popover-open")) popup.current?.showPopover(); }}
      onMouseLeave={scoreboard ? undefined : () => popup.current?.hidePopover()}
      className="rounded-xl border border-sky-200 bg-white/70 p-3 text-center transition hover:border-sky-500 focus-visible:outline-2 focus-visible:outline-sky-400 dark:border-white/10 dark:bg-white/5">
      <span className="block text-2xl font-black">{value}</span><span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">{label}<Info className="h-3 w-3" /></span>
    </button>
    <div ref={popup} id={id} popover="auto" role={scoreboard ? "dialog" : "note"} onToggle={event => setOpen(event.newState === "open")} style={position} className="ccol-counter-popover rounded-xl border border-sky-200 bg-white p-4 text-left text-slate-900 shadow-2xl dark:border-sky-800 dark:bg-slate-950 dark:text-slate-100" aria-label={title}>
      <header className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-bold">{title}</h2><button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Fechar informações" className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></header>
      {children}
    </div>
  </>;
}

export function CcolPanelCounters({ monitors, sourceCount, validRows, ready }: { monitors: CcoMonitorConfig[]; sourceCount: number; validRows: number; ready: boolean }) {
  const [now, setNow] = useState(() => new Date());
  return <div className="grid w-full min-w-0 grid-cols-3 gap-2 text-center text-xs sm:w-auto sm:min-w-[320px]" onClickCapture={() => setNow(new Date())}>
    <CounterPopover value={String(monitors.length)} label="monitores" title="Placar de atualização dos monitores" scoreboard>
      <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{monitors.length} monitores lógicos: 8 de classes/seções, Teste e Central. O Central reúne quatro telas físicas em uma apresentação.</p>
      <div className="mb-3 h-2 rounded-full" style={{ background: "linear-gradient(90deg,hsl(120 75% 38%),hsl(60 75% 45%),hsl(0 75% 38%))" }} /><p className="mb-3 flex justify-between text-[10px]"><span>Hoje</span><span>3 a 4 dias</span><span>7 dias ou mais</span></p>
      {!ready ? <p role="status" className="text-xs">Sincronizando responsáveis e horários...</p> : <ol className="space-y-2">{[...monitors].sort((a,b) => a.id-b.id).map(monitor => {
        const age = monitorUpdateAge(monitor.updatedAt, now), freshness = monitorFreshness(age);
        return <li key={monitor.id} data-monitor-freshness={age === null ? "unknown" : age} style={{ borderColor: freshness.border, background: freshness.background }} className="rounded-lg border-l-4 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><strong className="text-xs">{monitor.label}{monitor.responsibleSector ? ` · ${monitor.responsibleSector}` : ""}</strong><span className="text-[10px] font-semibold">{freshness.label}</span></div>
          <p className="mt-1 text-[11px]">{age === null ? "Sem atualização registrada" : <>{monitor.updatedByName ?? "Responsável não identificado"} · <time dateTime={monitor.updatedAt!}>{monitorUpdateTime(monitor.updatedAt!)}</time></>}</p>
        </li>;
      })}</ol>}
      <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">Cores pela última alteração registrada no MCL, contando dias no horário de Cuiabá. Sem registro: cinza.</p>
    </CounterPopover>
    <CounterPopover value={`${sourceCount}/2`} label="fontes ativas" title="Fontes orçamentárias do SAG">
      <p className="text-xs leading-5">Quantidade de fontes SAG carregadas: uma do exercício corrente e uma dos créditos do exercício anterior. O total necessário é 2. Arquivos fracionados são consolidados nessas duas fontes lógicas.</p>
    </CounterPopover>
    <CounterPopover value={String(validRows)} label="linhas válidas" title="Linhas válidas das fontes SAG">
      <p className="text-xs leading-5">Soma dos registros válidos importados das duas fontes SAG. O número corresponde a linhas de dados, considerando as fontes atualmente carregadas; não representa a quantidade de documentos, monitores ou telas.</p>
    </CounterPopover>
  </div>;
}
