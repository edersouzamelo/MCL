"use client";
import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Info, X } from "lucide-react";
import { monitorUpdateAge, monitorFreshness, monitorUpdateTime, sagPairFreshness, type SagFreshnessSource } from "@/modules/grupamento/monitor-freshness";
import type { CcoMonitorConfig } from "@/modules/grupamento/monitor";

function CounterPopover({ value, label, title, children, scoreboard = false, large = false, freshness, status }: { value: string; label: string; title: string; children: ReactNode; scoreboard?: boolean; large?: boolean; freshness?: number | null; status?: string }) {
  const id = useId(), popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [position, setPosition] = useState<CSSProperties>({});
  function positionPopup(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect(), width = Math.min(scoreboard ? 620 : large ? 400 : 340, window.innerWidth - 24);
    setPosition({ position: "fixed", inset: "auto", margin: 0, width, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - Math.min(window.innerHeight * .7, scoreboard ? 780 : large ? 560 : 210) - 12)) });
  }
  return <>
    <button type="button" popoverTarget={id} onClick={event => positionPopup(event.currentTarget)} aria-expanded={open} aria-controls={id} aria-label={`${value} ${label}: ${scoreboard ? "ver placar de atualizações" : "ver explicação"}`} title={title}
      onMouseEnter={scoreboard ? undefined : event => { positionPopup(event.currentTarget); if (!popup.current?.matches(":popover-open")) popup.current?.showPopover(); }}
      onMouseLeave={scoreboard ? undefined : () => popup.current?.hidePopover()}
      data-source-freshness={freshness === undefined ? undefined : freshness === null ? "unknown" : freshness} style={freshness === undefined ? undefined : { borderColor: monitorFreshness(freshness).border, background: monitorFreshness(freshness).background }}
      className="rounded-xl border border-sky-200 bg-white/70 p-3 text-center transition hover:border-sky-500 focus-visible:outline-2 focus-visible:outline-sky-400 dark:border-white/10 dark:bg-white/5">
      <span className="block text-2xl font-black">{value}</span><span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">{label}<Info className="h-3 w-3" /></span>{status && <span className="mt-1 block text-[10px] font-semibold leading-4">{status}</span>}
    </button>
    <div ref={popup} id={id} popover="auto" role={scoreboard ? "dialog" : "note"} onToggle={event => setOpen(event.newState === "open")} style={position} className="ccol-counter-popover rounded-xl border border-sky-200 bg-white p-4 text-left text-slate-900 shadow-2xl dark:border-sky-800 dark:bg-slate-950 dark:text-slate-100" aria-label={title}>
      <header className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-bold">{title}</h2><button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Fechar informações" className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></header>
      {children}
    </div>
  </>;
}

export function CcolPanelCounters({ monitors, sourceCount, validRows, ready, currentSource, rpnSource }: { monitors: CcoMonitorConfig[]; sourceCount: number; validRows: number; ready: boolean; currentSource?: SagFreshnessSource | null; rpnSource?: SagFreshnessSource | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const pair = sagPairFreshness(currentSource, rpnSource, now);
  const sourceStatus = !pair.complete ? "Carga incompleta" : pair.age === null ? "Data não identificada" : pair.age === 0 ? "Dados de hoje" : monitorFreshness(pair.age).label;
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
    <CounterPopover value={`${sourceCount}/2`} label="fontes ativas" title="Fontes orçamentárias do SAG" freshness={pair.age} status={sourceStatus} large>
      <p className="text-xs leading-5">Quantidade de fontes SAG carregadas: uma do exercício corrente e uma dos créditos do exercício anterior. O total necessário é 2. Arquivos fracionados são consolidados nessas duas fontes lógicas.</p>
      <ul className="mt-3 space-y-2">{[currentSource, rpnSource].map((source,index) => {
        const item = pair.sources[index], color = monitorFreshness(item.age);
        return <li key={index} data-sag-source-age={item.age === null ? "unknown" : item.age} className="rounded-lg border-l-4 p-2 text-xs" style={{ borderColor: color.border, background: color.background }}>
          <strong>{index === 0 ? "Exercício corrente" : "Créditos do exercício anterior"}</strong>
          <p className="mt-1 font-semibold">{!source ? "Fonte não carregada" : item.age === null ? "Data não identificada" : item.age === 0 ? "Dados de hoje" : color.label}</p>
          {source && <><p className="mt-1 break-words text-[11px]">{source.fileName}</p><p className="mt-1 text-[11px]">{item.basis === "reference" ? "Referência do relatório" : "Importado em"}: {item.date ? item.basis === "reference" ? new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba" }) : monitorUpdateTime(item.date) : "não identificada"}</p></>}
        </li>;
      })}</ul>
      <p className="mt-3 text-[10px] leading-4 text-slate-500 dark:text-slate-400">Mesma escala do placar: verde hoje, amarelo em 3 a 4 dias, vermelho a partir de 7 dias. O box considera a fonte mais antiga. Sem as duas fontes ou sem data: cinza. Usa a referência do relatório; na ausência dela, a importação.</p>
    </CounterPopover>
    <CounterPopover value={String(validRows)} label="linhas válidas" title="Linhas válidas das fontes SAG">
      <p className="text-xs leading-5">Soma dos registros válidos importados das duas fontes SAG. O número corresponde a linhas de dados, considerando as fontes atualmente carregadas; não representa a quantidade de documentos, monitores ou telas.</p>
    </CounterPopover>
  </div>;
}
