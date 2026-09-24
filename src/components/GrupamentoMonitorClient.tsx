"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Database, Monitor, Pause, Play, ShieldCheck, SkipBack, SkipForward, Square, Wifi, WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GrupamentoBaseMonitorScreen } from "@/components/GrupamentoBaseMonitorScreen";
import { GrupamentoRuleMonitorScreen } from "@/components/GrupamentoRuleMonitorScreen";
import { MonitorDocumentScene } from "@/components/MonitorDocumentScene";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";
import { CCO_RULE_SOURCE } from "@/modules/grupamento/cco";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
  CCO_DEFAULT_LOOP_DELAY_SECONDS,
  CCO_DEFAULT_SCROLL_PX_PER_SECOND,
  CCO_PI_ROWS_PER_PAGE,
  CCO_PI_SCROLL_PX_PER_SECOND,
  CCO_SCROLL_BOTTOM_HOLD_MS,
  CCO_SCROLL_TOP_HOLD_MS,
  CCO_SCREEN_CATALOG,
  CCO_UNIT_ROWS_PER_PAGE,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  readableMonitorCycleMs,
  type CcoMonitorConfig,
  type CcoScreenId,
} from "@/modules/grupamento/monitor";

const MIN_KIOSK_SCALE = 0.86;
const SCREEN_FADE_MS = 720;
const DATA_REFRESH_MS = 30_000;

function load<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function monitorCacheKey(monitorId: number, suffix: "sag" | "rpn" | "scenes") {
  return `mcl:monitor:${monitorId}:${suffix}:v1`;
}

function store(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // O cache local é contingência. Falha de quota não pode derrubar a exibição.
  }
}

function sceneAssetUrls(scenes: MonitorDocumentSceneDto[]) {
  const urls = new Set<string>();
  for (const scene of scenes) {
    for (const assetId of scene.payload.assetIds ?? []) {
      urls.add(`/api/grupamento/monitor-content/assets/${assetId}`);
    }
    for (const element of scene.payload.layout?.elements ?? []) {
      if (element.kind === "image" && element.assetId) {
        urls.add(`/api/grupamento/monitor-content/assets/${element.assetId}`);
      }
    }
  }
  return [...urls];
}

function pageSizeForScreen(screen: CcoScreenId) {
  if (screen === "pis") return CCO_PI_ROWS_PER_PAGE;
  if (screen.startsWith("units-")) return CCO_UNIT_ROWS_PER_PAGE;
  return 0;
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
  const [documentScenes, setDocumentScenes] = useState<MonitorDocumentSceneDto[]>([]);
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [screenCycleMs, setScreenCycleMs] = useState(CCO_DEFAULT_LOOP_DELAY_SECONDS * 1000);
  const [transitioning, setTransitioning] = useState(false);
  const [playbackState, setPlaybackState] = useState<"playing" | "paused" | "stopped">("playing");
  const [connectionState, setConnectionState] = useState<"online" | "offline" | "syncing">("syncing");
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
          store(
            GROUP_STORAGE_KEYS.monitors,
            stored.map((item) => (item.id === monitorId ? normalized : item)),
          );
        }
      }

      const cachedSag = load<SagImportResult>(monitorCacheKey(monitorId, "sag"));
      const cachedRpn = load<RpnImportResult>(monitorCacheKey(monitorId, "rpn"));
      const cachedScenes = load<MonitorDocumentSceneDto[]>(monitorCacheKey(monitorId, "scenes"));
      if (!cancelled) {
        if (cachedSag) setSag(cachedSag);
        if (cachedRpn) setRpn(cachedRpn);
        if (cachedScenes) setDocumentScenes(cachedScenes);
      }

      if (!navigator.onLine) {
        if (!cancelled) setConnectionState("offline");
        return;
      }

      if (!cancelled) setConnectionState("syncing");
      let networkSucceeded = false;

      try {
        const response = await fetch("/api/grupamento/sag/latest", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          const current = payload.current ?? null;
          const previous = payload.rpn ?? null;
          if (current) store(monitorCacheKey(monitorId, "sag"), current);
          if (previous) store(monitorCacheKey(monitorId, "rpn"), previous);
          if (!cancelled) {
            if (current) setSag(current);
            if (previous) setRpn(previous);
          }
          networkSucceeded = true;
        }
      } catch {
        // Mantém o último snapshot local validado.
      }

      try {
        const response = await fetch(`/api/grupamento/monitor-content/playlist?monitorId=${monitorId}`, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          const scenes = (payload.scenes ?? []) as MonitorDocumentSceneDto[];
          store(monitorCacheKey(monitorId, "scenes"), scenes);
          if (!cancelled) setDocumentScenes(scenes);
          networkSucceeded = true;

          const assetUrls = sceneAssetUrls(scenes);
          void Promise.allSettled(assetUrls.map((url) => fetch(url, { cache: "force-cache" })));
        }
      } catch {
        // Mantém playlist e assets já disponíveis localmente.
      }

      if (!cancelled) {
        setConnectionState(networkSucceeded ? "online" : "offline");
      }
    };

    const frame = window.requestAnimationFrame(() => { void hydrate(); });
    const poll = window.setInterval(() => { void hydrate(); }, DATA_REFRESH_MS);
    const refresh = () => { void hydrate(); };
    const online = () => { setConnectionState("syncing"); void hydrate(); };
    const offline = () => setConnectionState("offline");

    window.addEventListener("storage", refresh);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("mcl-grupamento-sag-updated", refresh);
    window.addEventListener("mcl-grupamento-rpn-updated", refresh);
    window.addEventListener("mcl-grupamento-monitors-updated", refresh);
    window.addEventListener("mcl-grupamento-document-content-updated", refresh);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(poll);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("mcl-grupamento-sag-updated", refresh);
      window.removeEventListener("mcl-grupamento-rpn-updated", refresh);
      window.removeEventListener("mcl-grupamento-monitors-updated", refresh);
      window.removeEventListener("mcl-grupamento-document-content-updated", refresh);
    };
  }, [monitorId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  type PlaylistItem =
    | { kind: "system"; key: string; screen: CcoScreenId; label: string }
    | { kind: "document"; key: string; scene: MonitorDocumentSceneDto; label: string };

  const playlist = useMemo<PlaylistItem[]>(() => [
    ...monitor.screens.map((screen) => ({
      kind: "system" as const,
      key: `system:${screen}`,
      screen,
      label: CCO_SCREEN_CATALOG.find((item) => item.id === screen)?.label ?? screen,
    })),
    ...documentScenes.map((scene) => ({
      kind: "document" as const,
      key: `document:${scene.id}`,
      scene,
      label: scene.title,
    })),
  ], [documentScenes, monitor.screens]);

  const safeIndex = Math.min(screenIndex, Math.max(0, playlist.length - 1));
  const activeItem = playlist[safeIndex] ?? {
    kind: "system" as const,
    key: "system:overview",
    screen: "overview" as CcoScreenId,
    label: "Visão executiva",
  };
  const activeScreen = activeItem.kind === "system" ? activeItem.screen : null;
  const screenLabel = activeItem.label;
  const effectiveLoop = monitor.mode === "loop" && playlist.length > 1;
  const autoAdvance = effectiveLoop && playbackState === "playing";

  useEffect(() => {
    if (screenIndex < playlist.length) return;
    const frame = window.requestAnimationFrame(() => setScreenIndex(0));
    return () => window.cancelAnimationFrame(frame);
  }, [playlist.length, screenIndex]);

  useEffect(() => {
    if (!autoAdvance) return;

    let switchTimer = 0;
    const timer = window.setTimeout(() => {
      setTransitioning(true);
      switchTimer = window.setTimeout(() => {
        setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000);
        setScreenIndex((current) => (current + 1) % playlist.length);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setTransitioning(false));
        });
      }, SCREEN_FADE_MS);
    }, screenCycleMs);

    return () => {
      window.clearTimeout(timer);
      if (switchTimer) window.clearTimeout(switchTimer);
    };
  }, [autoAdvance, monitor.delaySeconds, playlist.length, screenIndex, screenCycleMs]);

  const stepPlaylist = (direction: -1 | 1) => {
    if (!playlist.length) return;
    setTransitioning(false);
    setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000);
    setScreenIndex((current) => (current + direction + playlist.length) % playlist.length);
  };

  const stopPlayback = () => {
    setPlaybackState("stopped");
    setTransitioning(false);
    setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000);
    setScreenIndex(0);
  };

  const ccol = monitor.layout === "ccol";
  const isRuleScreen = activeScreen ? activeScreen === "briefing" || activeScreen.startsWith("class-") : false;

  const screenContent = !monitor.enabled ? (
    <Empty ccol={ccol} title="Monitor desativado" description="Ative esta saída na matriz do CCOL para voltar a exibir conteúdo." />
  ) : activeItem.kind === "document" ? (
    <MonitorDocumentScene scene={activeItem.scene} ccol={ccol} />
  ) : !sag || !rpn ? (
    <Empty ccol={ccol} title="Par SAG incompleto" description="Esta tela exige Exercício Corrente e créditos do exercício anterior validados. Não há substituição por números sintéticos." />
  ) : isRuleScreen ? (
    <GrupamentoRuleMonitorScreen screen={activeItem.screen} sag={sag} rpn={rpn} layout={monitor.layout} />
  ) : (
    <GrupamentoBaseMonitorScreen screen={activeItem.screen} sag={sag} rpn={rpn} layout={monitor.layout} />
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
          className={`h-full w-full transition-[opacity,filter] ease-[cubic-bezier(0.22,1,0.36,1)] ${transitioning ? "opacity-0 blur-[1.5px]" : "opacity-100 blur-0"}`}
          style={{ transitionDuration: `${SCREEN_FADE_MS}ms` }}
        >
          <div key={activeItem.key} className="mcl-monitor-scene h-full w-full">
            <MonitorViewport
              screenKey={activeItem.kind === "system" ? activeItem.screen : activeItem.key}
              cycleSeconds={Math.max(5, monitor.delaySeconds)}
              loopMode={effectiveLoop}
              paused={playbackState !== "playing"}
              fitMode={activeItem.kind === "document" ? "contain" : "scroll"}
              onRequiredCycleMs={(requiredMs) => setScreenCycleMs((current) => Math.abs(current - requiredMs) > 250 ? requiredMs : current)}
            >
              {screenContent}
            </MonitorViewport>
          </div>
        </div>
      </section>

      {playlist.length > 1 ? (
        <div className={`absolute bottom-12 left-1/2 z-40 -translate-x-1/2 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur-md transition-opacity ${ccol ? "border-slate-300/70 bg-white/72 text-slate-700" : "border-white/10 bg-slate-950/62 text-slate-300"}`}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => stepPlaylist(-1)} className="rounded-full p-2 transition hover:bg-sky-400/10 hover:text-sky-300" aria-label="Voltar quadro" title="Voltar"><SkipBack className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => setPlaybackState((state) => state === "playing" ? "paused" : "playing")}
              className="rounded-full p-2 transition hover:bg-sky-400/10 hover:text-sky-300"
              aria-label={playbackState === "playing" ? "Pausar apresentação" : "Retomar apresentação"}
              title={playbackState === "playing" ? "Pausar" : "Retomar"}
            >
              {playbackState === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={stopPlayback} className="rounded-full p-2 transition hover:bg-rose-400/10 hover:text-rose-300" aria-label="Parar apresentação" title="Parar e voltar ao primeiro quadro"><Square className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => stepPlaylist(1)} className="rounded-full p-2 transition hover:bg-sky-400/10 hover:text-sky-300" aria-label="Avançar quadro" title="Avançar"><SkipForward className="h-4 w-4" /></button>
          </div>
        </div>
      ) : null}

      <div className={`mcl-monitor-watermark pointer-events-none absolute bottom-11 right-6 z-30 flex min-w-[82px] flex-col items-center rounded-xl border px-3 py-2.5 text-center backdrop-blur-md ${ccol ? "border-slate-300/60 bg-white/50 text-slate-700 opacity-60" : "border-white/10 bg-slate-950/35 text-white opacity-52"}`}>
        <BrandLogo className="h-11 w-11" tone={ccol ? "green" : "sky"} sizes="44px" />
        <div className={`mt-1 text-[8px] font-black uppercase tracking-[0.16em] ${ccol ? "text-slate-600" : "text-sky-100"}`}>Continuidade</div>
        <div className={`mt-0.5 text-[8px] font-black uppercase tracking-[0.22em] ${ccol ? "text-slate-500" : "text-sky-300"}`}>Logística</div>
      </div>

      <footer className={`mcl-monitor-footer relative z-20 flex h-10 shrink-0 items-center justify-between gap-4 border-t px-7 text-[10px] backdrop-blur-xl ${ccol ? "border-slate-300/80 bg-white/85 text-slate-600" : "border-white/10 bg-slate-950/85 text-slate-400"}`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex min-w-0 items-center gap-1.5">
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Fonte: {activeItem.kind === "document" ? activeItem.scene.sourceFileName : (sag && rpn ? `${sag.source.fileName} + ${rpn.source.fileName}` : "par incompleto")}</span>
          </span>
          {activeItem.kind === "system" ? (
            <span className="hidden items-center gap-1.5 xl:flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Matriz PI/Classe: {CCO_RULE_SOURCE.fileName} · {CCO_RULE_SOURCE.referenceDate}
            </span>
          ) : (
            <span className="hidden items-center gap-1.5 xl:flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Conteúdo documental · aprovação humana registrada
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span>{monitor.layout === "ccol" ? "layout CCOL" : "layout MCL"}</span>
          <span>{effectiveLoop ? `loop · ${monitor.delaySeconds}s · ${playbackState === "playing" ? "rodando" : playbackState === "paused" ? "pausado" : "parado"}` : "tela fixa"}</span>
          <span>dados · 30s</span>
          <span>auto F5 · 5min</span>
          <span>{safeIndex + 1}/{Math.max(1, playlist.length)}</span>
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
  paused,
  fitMode,
  onRequiredCycleMs,
}: {
  children: ReactNode;
  screenKey: string;
  cycleSeconds: number;
  loopMode: boolean;
  paused: boolean;
  fitMode: "contain" | "scroll";
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
      const nextScale = fitMode === "contain" ? fitRatio : Math.max(MIN_KIOSK_SCALE, fitRatio);
      const nextMaxOffset = fitMode === "contain" ? 0 : Math.max(0, contentHeight * nextScale - frameHeight);
      const requiredCycleMs = fitMode === "contain"
        ? Math.max(5, cycleSeconds) * 1000
        : readableMonitorCycleMs(nextMaxOffset, cycleSeconds, screenKey);

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
  }, [cycleSeconds, fitMode, onRequiredCycleMs, screenKey]);

  useEffect(() => {
    let animationFrame = 0;
    if (fitMode === "contain") {
      animationFrame = window.requestAnimationFrame(() => setOffset(0));
      return () => window.cancelAnimationFrame(animationFrame);
    }
    if (paused) return;
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
  }, [fitMode, maxOffset, loopMode, paused, screenKey]);

  return (
    <div ref={frameRef} className="h-full w-full overflow-hidden">
      <div
        className={fitMode === "contain" ? "h-full w-full will-change-transform" : "w-full will-change-transform"}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <div
          ref={contentRef}
          className={fitMode === "contain" ? "h-full w-full will-change-transform" : "w-full will-change-transform"}
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
