"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Clock3, Database, Monitor, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GrupamentoBaseMonitorScreen } from "@/components/GrupamentoBaseMonitorScreen";
import { GrupamentoRuleMonitorScreen } from "@/components/GrupamentoRuleMonitorScreen";
import { CCO_RULE_SOURCE } from "@/modules/grupamento/cco";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
  CCO_DEFAULT_LOOP_DELAY_SECONDS,
  CCO_DEFAULT_SCROLL_PX_PER_SECOND,
  CCO_PI_SCROLL_PX_PER_SECOND,
  CCO_SCROLL_BOTTOM_HOLD_MS,
  CCO_SCROLL_TOP_HOLD_MS,
  CCO_SCREEN_CATALOG,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  readableMonitorCycleMs,
  type CcoMonitorConfig,
} from "@/modules/grupamento/monitor";

const MIN_KIOSK_SCALE = 0.86;
const SCREEN_FADE_MS = 720;
const DATA_REFRESH_MS = 30_000;
const PAGE_RELOAD_MS = 5 * 60_000;

function load<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function normalizeMonitor(item: CcoMonitorConfig): CcoMonitorConfig {
  return {
    ...item,
    layout: item.layout ?? "mcl",
    delaySeconds: item.delaySeconds === 15 ? CCO_DEFAULT_LOOP_DELAY_SECONDS : item.delaySeconds,
  };
}

export function GrupamentoMonitorClient({ monitorId }: { monitorId: number }) {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [rpn, setRpn] = useState<RpnImportResult | null>(null);
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [screenCycleMs, setScreenCycleMs] = useState(CCO_DEFAULT_LOOP_DELAY_SECONDS * 1000);
  const [transitioning, setTransitioning] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const stored = load<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors);
      const selected = stored?.find((item) => item.id === monitorId);
      if (selected && !cancelled) {
        const normalized = normalizeMonitor(selected);
        setMonitor(normalized);
        if (selected.delaySeconds !== normalized.delaySeconds && stored) {
          window.localStorage.setItem(
            GROUP_STORAGE_KEYS.monitors,
            JSON.stringify(stored.map((item) => (item.id === monitorId ? normalized : item))),
          );
        }
      }

      try {
        const response = await fetch("/api/grupamento/sag/latest", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) {
          setSag(payload.current ?? null);
          setRpn(payload.rpn ?? null);
        }
      } catch {
        if (!cancelled) {
          setSag(null);
          setRpn(null);
        }
      }
    };

    const frame = window.requestAnimationFrame(() => { void hydrate(); });
    const poll = window.setInterval(() => { void hydrate(); }, DATA_REFRESH_MS);
    const refresh = () => { void hydrate(); };

    window.addEventListener("storage", refresh);
    window.addEventListener("mcl-grupamento-sag-updated", refresh);
    window.addEventListener("mcl-grupamento-rpn-updated", refresh);
    window.addEventListener("mcl-grupamento-monitors-updated", refresh);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(poll);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("mcl-grupamento-sag-updated", refresh);
      window.removeEventListener("mcl-grupamento-rpn-updated", refresh);
      window.removeEventListener("mcl-grupamento-monitors-updated", refresh);
    };
  }, [monitorId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.location.reload();
    }, PAGE_RELOAD_MS);
    return () => window.clearInterval(timer);
  }, []);

  const safeIndex = Math.min(screenIndex, Math.max(0, monitor.screens.length - 1));
  const activeScreen = monitor.screens[safeIndex] ?? "overview";

  useEffect(() => {
    if (monitor.mode !== "loop" || monitor.screens.length <= 1) return;

    let switchTimer = 0;
    const timer = window.setTimeout(() => {
      setTransitioning(true);
      switchTimer = window.setTimeout(() => {
        setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000);
        setScreenIndex((current) => (current + 1) % monitor.screens.length);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setTransitioning(false));
        });
      }, SCREEN_FADE_MS);
    }, screenCycleMs);

    return () => {
      window.clearTimeout(timer);
      if (switchTimer) window.clearTimeout(switchTimer);
    };
  }, [monitor.mode, monitor.screens, monitor.delaySeconds, screenIndex, screenCycleMs]);
  const screenLabel = CCO_SCREEN_CATALOG.find((item) => item.id === activeScreen)?.label ?? "Visão executiva";
  const ccol = monitor.layout === "ccol";
  const isRuleScreen = activeScreen === "briefing" || activeScreen.startsWith("class-");

  const screenContent = !monitor.enabled ? (
    <Empty ccol={ccol} title="Monitor desativado" description="Ative esta saída na matriz do CCOL para voltar a exibir conteúdo." />
  ) : !sag || !rpn ? (
    <Empty ccol={ccol} title="Par SAG incompleto" description="Esta tela exige Exercício Corrente e créditos do exercício anterior validados. Não há substituição por números sintéticos." />
  ) : isRuleScreen ? (
    <GrupamentoRuleMonitorScreen screen={activeScreen} sag={sag} rpn={rpn} layout={monitor.layout} />
  ) : (
    <GrupamentoBaseMonitorScreen screen={activeScreen} sag={sag} rpn={rpn} layout={monitor.layout} />
  );

  return (
    <main
      className={`mcl-monitor-shell ${ccol ? "mcl-monitor-shell-ccol" : "mcl-monitor-shell-mcl"} relative flex h-[100dvh] min-h-0 flex-col overflow-hidden ${ccol ? "bg-[#f7f8fa] text-slate-950" : "bg-slate-950 text-white"}`}
      style={{
        backgroundImage: ccol
          ? "radial-gradient(circle at 82% 5%, rgba(14,165,233,.10), transparent 30%), radial-gradient(circle at 8% 92%, rgba(6,182,212,.06), transparent 34%), linear-gradient(145deg, #ffffff 0%, #f6f9fb 50%, #edf4f7 100%)"
          : "radial-gradient(circle at 82% 5%, rgba(14,165,233,.18), transparent 31%), radial-gradient(circle at 10% 92%, rgba(34,211,238,.08), transparent 36%), linear-gradient(145deg, #020617 0%, #07111d 48%, #020617 100%)",
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className={`mcl-monitor-ambient mcl-monitor-ambient-one absolute -right-20 -top-24 h-96 w-96 rounded-full blur-3xl ${ccol ? "bg-sky-300/15" : "bg-sky-400/10"}`} />
        <div className={`mcl-monitor-ambient mcl-monitor-ambient-two absolute -bottom-32 left-[8%] h-80 w-[42vw] rounded-full blur-3xl ${ccol ? "bg-cyan-200/20" : "bg-cyan-400/[0.06]"}`} />
        <div className={`absolute inset-x-0 top-0 h-44 bg-gradient-to-b ${ccol ? "from-white/75 to-transparent" : "from-sky-300/[0.025] to-transparent"}`} />
        <div className={`mcl-monitor-stripes ${ccol ? "mcl-monitor-stripes-light" : "mcl-monitor-stripes-dark"}`} />
        <div className="mcl-monitor-horizon" />
        <div className="mcl-monitor-broadcast-sweep" />
        <div className="mcl-monitor-scanline" />
      </div>

      <header className={`mcl-monitor-header relative z-20 flex h-[76px] shrink-0 items-center justify-between gap-5 overflow-hidden border-b px-7 py-3 backdrop-blur-xl ${ccol ? "border-slate-300/80 bg-white/80" : "border-white/10 bg-slate-950/72"}`}>
        <div aria-hidden className="mcl-monitor-header-glint" />
        <div className="flex min-w-0 items-center gap-4">
          <div className={`mcl-monitor-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${ccol ? "border-sky-800/20 bg-sky-900 text-white" : "border-sky-400/20 bg-sky-400/10 text-sky-300"}`}>
            <Monitor className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className={`truncate text-[11px] font-bold uppercase tracking-[0.22em] ${ccol ? "text-sky-800" : "text-sky-300"}`}>MCL · Escalão / Grupamento Logístico</div>
            <div className="mt-1 truncate text-lg font-black">{monitor.label} · {screenLabel}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-5 text-right">
          <div>
            <div className="font-mono text-base font-bold">{now.toLocaleTimeString("pt-BR")}</div>
            <div className={ccol ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>{now.toLocaleDateString("pt-BR")}</div>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${monitor.enabled ? "mcl-monitor-live " : ""}${monitor.enabled ? (ccol ? "bg-emerald-100 text-emerald-800" : "bg-emerald-400/10 text-emerald-300") : (ccol ? "bg-amber-100 text-amber-800" : "bg-amber-400/10 text-amber-300")}`}>
            {monitor.enabled ? "Saída ativa" : "Saída desativada"}
          </div>
        </div>
      </header>

      {ccol ? (
        <div className="relative z-20 shrink-0 border-b-2 border-sky-900/80 bg-white/60 px-7 py-1.5 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-sky-950 backdrop-blur">
          Prontidão Logística · na defesa e preservação da fronteira oeste
        </div>
      ) : null}

      <section className="relative z-10 min-h-0 flex-1 overflow-hidden px-6 py-4">
        <div
          className={`h-full w-full transition-[opacity,transform,filter] ease-[cubic-bezier(0.22,1,0.36,1)] ${transitioning ? "translate-y-2 scale-[0.997] opacity-0 blur-[2px]" : "translate-y-0 scale-100 opacity-100 blur-0"}`}
          style={{ transitionDuration: `${SCREEN_FADE_MS}ms` }}
        >
          <div key={activeScreen} className="mcl-monitor-scene h-full w-full">
            <MonitorViewport
              screenKey={activeScreen}
              cycleSeconds={Math.max(5, monitor.delaySeconds)}
              loopMode={monitor.mode === "loop" && monitor.screens.length > 1}
              onRequiredCycleMs={(requiredMs) => setScreenCycleMs((current) => Math.abs(current - requiredMs) > 250 ? requiredMs : current)}
            >
              {screenContent}
            </MonitorViewport>
          </div>
        </div>
      </section>

      <div className={`mcl-monitor-watermark pointer-events-none absolute bottom-11 right-6 z-30 flex min-w-[82px] flex-col items-center rounded-xl border px-3 py-2.5 text-center backdrop-blur-md ${ccol ? "border-slate-300/60 bg-white/50 text-slate-700 opacity-60" : "border-white/10 bg-slate-950/35 text-white opacity-52"}`}>
        <BrandLogo className="h-11 w-11" tone={ccol ? "green" : "sky"} sizes="44px" />
        <div className={`mt-1 text-[8px] font-black uppercase tracking-[0.16em] ${ccol ? "text-slate-600" : "text-sky-100"}`}>Continuidade</div>
        <div className={`mt-0.5 text-[8px] font-black uppercase tracking-[0.22em] ${ccol ? "text-slate-500" : "text-sky-300"}`}>Logística</div>
      </div>

      <footer className={`mcl-monitor-footer relative z-20 flex h-10 shrink-0 items-center justify-between gap-4 border-t px-7 text-[10px] backdrop-blur-xl ${ccol ? "border-slate-300/80 bg-white/85 text-slate-600" : "border-white/10 bg-slate-950/85 text-slate-400"}`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex min-w-0 items-center gap-1.5">
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Fonte: {sag && rpn ? `${sag.source.fileName} + ${rpn.source.fileName}` : "par incompleto"}</span>
          </span>
          <span className="hidden items-center gap-1.5 xl:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Matriz PI/Classe: {CCO_RULE_SOURCE.fileName} · {CCO_RULE_SOURCE.referenceDate}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span>{monitor.layout === "ccol" ? "layout CCOL" : "layout MCL"}</span>
          <span>{monitor.mode === "loop" ? `loop · ${monitor.delaySeconds}s` : "tela fixa"}</span>
          <span>dados · 30s</span>
          <span>auto F5 · 5min</span>
          <span>{safeIndex + 1}/{monitor.screens.length}</span>
        </div>
      </footer>
    </main>
  );
}

function MonitorViewport({
  children,
  screenKey,
  cycleSeconds,
  loopMode,
  onRequiredCycleMs,
}: {
  children: ReactNode;
  screenKey: string;
  cycleSeconds: number;
  loopMode: boolean;
  onRequiredCycleMs: (requiredMs: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [maxOffset, setMaxOffset] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const measure = () => {
      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      if (!frameWidth || !frameHeight || !contentWidth || !contentHeight) return;

      const fitRatio = Math.min(frameWidth / contentWidth, frameHeight / contentHeight, 1);
      const nextScale = Math.max(MIN_KIOSK_SCALE, fitRatio);
      const nextMaxOffset = Math.max(0, contentHeight * nextScale - frameHeight);
      const requiredCycleMs = readableMonitorCycleMs(nextMaxOffset, cycleSeconds, screenKey);

      setScale((current) => Math.abs(current - nextScale) > 0.005 ? nextScale : current);
      setMaxOffset(nextMaxOffset);
      setOffset(0);
      onRequiredCycleMs(requiredCycleMs);
    };

    const frameId = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [cycleSeconds, onRequiredCycleMs, screenKey]);

  useEffect(() => {
    let animationFrame = 0;
    if (maxOffset <= 2) {
      animationFrame = window.requestAnimationFrame(() => setOffset(0));
      return () => window.cancelAnimationFrame(animationFrame);
    }


    const startedAt = performance.now();
    const pixelsPerSecond = screenKey === "pis"
      ? CCO_PI_SCROLL_PX_PER_SECOND
      : CCO_DEFAULT_SCROLL_PX_PER_SECOND;
    const travelMs = Math.max(3_500, (maxOffset / pixelsPerSecond) * 1000);
    const singleCycleMs = CCO_SCROLL_TOP_HOLD_MS + travelMs + CCO_SCROLL_BOTTOM_HOLD_MS + travelMs;

    const animate = (time: number) => {
      const elapsed = time - startedAt;
      let nextOffset = 0;

      if (loopMode) {
        if (elapsed <= CCO_SCROLL_TOP_HOLD_MS) {
          nextOffset = 0;
        } else {
          const progress = Math.min(1, (elapsed - CCO_SCROLL_TOP_HOLD_MS) / travelMs);
          nextOffset = maxOffset * progress;
        }
      } else {
        const phase = elapsed % singleCycleMs;
        if (phase <= CCO_SCROLL_TOP_HOLD_MS) {
          nextOffset = 0;
        } else if (phase <= CCO_SCROLL_TOP_HOLD_MS + travelMs) {
          nextOffset = maxOffset * ((phase - CCO_SCROLL_TOP_HOLD_MS) / travelMs);
        } else if (phase <= CCO_SCROLL_TOP_HOLD_MS + travelMs + CCO_SCROLL_BOTTOM_HOLD_MS) {
          nextOffset = maxOffset;
        } else if (phase <= CCO_SCROLL_TOP_HOLD_MS + travelMs + CCO_SCROLL_BOTTOM_HOLD_MS + travelMs) {
          const returnProgress = (phase - CCO_SCROLL_TOP_HOLD_MS - travelMs - CCO_SCROLL_BOTTOM_HOLD_MS) / travelMs;
          nextOffset = maxOffset * (1 - returnProgress);
        }
      }

      setOffset(nextOffset);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [maxOffset, loopMode, screenKey]);

  return (
    <div ref={frameRef} className="h-full w-full overflow-hidden">
      <div
        className="w-full will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <div
          ref={contentRef}
          className="w-full will-change-transform"
          style={{
            transform: `translate3d(0, -${scale > 0 ? offset / scale : 0}px, 0)`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Empty({ ccol, title, description }: { ccol: boolean; title: string; description: string }) {
  return (
    <div className="flex h-full min-h-[55vh] items-center justify-center">
      <div className="max-w-lg text-center">
        <Clock3 className={`mx-auto h-10 w-10 ${ccol ? "text-slate-400" : "text-slate-600"}`} />
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className={`mt-3 leading-6 ${ccol ? "text-slate-600" : "text-slate-400"}`}>{description}</p>
      </div>
    </div>
  );
}
