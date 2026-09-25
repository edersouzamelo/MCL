"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Clock3, Database, Pause, Play, ShieldCheck, SkipBack, SkipForward, Square, Wifi, WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GrupamentoBaseMonitorScreen } from "@/components/GrupamentoBaseMonitorScreen";
import { GrupamentoRuleMonitorScreen } from "@/components/GrupamentoRuleMonitorScreen";
import { MonitorViewport } from "@/components/MonitorViewport";
import { prepareMonitorNavigation, readMonitorSnapshot, synchronizeMonitor, type MonitorSnapshot } from "@/modules/grupamento/monitor-cache";
import { MonitorDocumentScene } from "@/components/MonitorDocumentScene";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";
import { CCO_RULE_SOURCE } from "@/modules/grupamento/cco";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
  CCO_DEFAULT_LOOP_DELAY_SECONDS,
  CCO_PI_ROWS_PER_PAGE,
  CCO_SCREEN_CATALOG,
  CCO_UNIT_ROWS_PER_PAGE,
  GROUP_STORAGE_KEYS,
  defaultCcoMonitorConfig,
  type CcoMonitorConfig,
  type CcoScreenId,
} from "@/modules/grupamento/monitor";

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

export function GrupamentoMonitorClient({ monitorId, organizationId }: { monitorId: number; organizationId: string }) {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [rpn, setRpn] = useState<RpnImportResult | null>(null);
  const [documentScenes, setDocumentScenes] = useState<MonitorDocumentSceneDto[]>([]);
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [screenCycleMs, setScreenCycleMs] = useState(CCO_DEFAULT_LOOP_DELAY_SECONDS * 1000);
  const [transitioning, setTransitioning] = useState(false);
  const [playbackState, setPlaybackState] = useState<"playing" | "paused" | "stopped">("playing");
  const [connectionState, setConnectionState] = useState<"online" | "offline" | "syncing">("syncing");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cacheIssue, setCacheIssue] = useState<string | null>(null);
  const activeVersion = useRef<string | null>(null);
  const pendingSnapshot = useRef<MonitorSnapshot | null>(null);
  const hasSnapshot = useRef(false);
  const [now, setNow] = useState(new Date());

  const applySnapshot = useCallback((snapshot: MonitorSnapshot) => {
    if (snapshot.version === activeVersion.current) return;
    activeVersion.current = snapshot.version;
    hasSnapshot.current = true;
    setSag(snapshot.sag);
    setRpn(snapshot.rpn);
    setDocumentScenes(snapshot.scenes);
    setMonitor(normalizeMonitor(snapshot.monitor));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    let hydrated = false;
    let navigationReady = false;
    let selected = defaultCcoMonitorConfig()[Math.max(0, Math.min(7, monitorId - 1))];
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        if (!hydrated) {
          const cached = await readMonitorSnapshot(organizationId, monitorId);
          if (cancelled) return;
          if (cached) { selected = cached.monitor; applySnapshot(cached); }
          hydrated = true;
        }
        selected = normalizeMonitor(load<CcoMonitorConfig[]>(GROUP_STORAGE_KEYS.monitors)?.find((item) => item.id === monitorId) ?? selected);
        if (!navigator.onLine) { setConnectionState("offline"); return; }
        // Background synchronization never replaces the scene while it is being read.
        const snapshot = await synchronizeMonitor(organizationId, selected);
        if (cancelled) return;
        setCacheIssue(null);
        setConnectionState("online");
        if (!hasSnapshot.current) applySnapshot(snapshot);
        else pendingSnapshot.current = snapshot.version !== activeVersion.current ? snapshot : null;
        if (!navigationReady) { await prepareMonitorNavigation(monitorId); navigationReady = true; }
      } catch (error) {
        if (!cancelled) {
          setConnectionState("offline");
          setCacheIssue(error instanceof Error ? error.message : "Falha de sincronização/cache");
          console.warn("MCL monitor: última versão preservada", error);
        }
      } finally { running = false; }
    };
    void refresh();
    const poll = window.setInterval(() => { void refresh(); }, DATA_REFRESH_MS);
    const refreshEvent = () => { void refresh(); };
    const offline = () => setConnectionState("offline");
    const events = ["storage", "online", "mcl-grupamento-sag-updated", "mcl-grupamento-rpn-updated", "mcl-grupamento-monitors-updated", "mcl-grupamento-document-content-updated"];
    events.forEach((event) => window.addEventListener(event, refreshEvent));
    window.addEventListener("offline", offline);
    return () => {
      cancelled = true;
      clearInterval(poll);
      events.forEach((event) => window.removeEventListener(event, refreshEvent));
      window.removeEventListener("offline", offline);
    };
  }, [monitorId, organizationId, applySnapshot]);

  const commitPending = useCallback(() => {
    if (!pendingSnapshot.current) return;
    applySnapshot(pendingSnapshot.current);
    pendingSnapshot.current = null;
  }, [applySnapshot]);
  const onPageCount = useCallback((count: number) => {
    setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000 * count);
  }, [monitor.delaySeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  type PlaylistItem =
    | { kind: "system"; key: string; screen: CcoScreenId; label: string; page: number; pageSize: number }
    | { kind: "document"; key: string; scene: MonitorDocumentSceneDto; label: string };

  const playlist = useMemo<PlaylistItem[]>(() => {
    const systemItems = (sag && rpn ? monitor.screens : []).flatMap((screen) => {
      const pageSize = pageSizeForScreen(screen);
      let rowCount = 0;
      if (screen === "pis") rowCount = sag?.byPi.length ?? 0;
      if (screen === "units-current-160") rowCount = sag?.byUg.filter((item) => item.ug.startsWith("160")).length ?? 0;
      if (screen === "units-current-167") rowCount = sag?.byUg.filter((item) => item.ug.startsWith("167")).length ?? 0;
      if (screen === "units-rpn-160") rowCount = rpn?.byUg.filter((item) => item.ug.startsWith("160")).length ?? 0;
      if (screen === "units-rpn-167") rowCount = rpn?.byUg.filter((item) => item.ug.startsWith("167")).length ?? 0;

      const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(rowCount / pageSize)) : 1;
      const baseLabel = CCO_SCREEN_CATALOG.find((item) => item.id === screen)?.label ?? screen;
      return Array.from({ length: pageCount }, (_, page) => ({
        kind: "system" as const,
        key: `system:${screen}:${page}`,
        screen,
        page,
        pageSize,
        label: pageCount > 1 ? `${baseLabel} · ${page + 1}/${pageCount}` : baseLabel,
      }));
    });

    return [
      ...systemItems,
      ...documentScenes.map((scene) => ({
        kind: "document" as const,
        key: `document:${scene.id}`,
        scene,
        label: scene.title,
      })),
    ];
  }, [documentScenes, monitor.screens, rpn, sag]);

  const safeIndex = Math.min(screenIndex, Math.max(0, playlist.length - 1));
  const activeItem = playlist[safeIndex] ?? {
    kind: "system" as const,
    key: "system:overview",
    screen: "overview" as CcoScreenId,
    label: "Visão executiva",
    page: 0,
    pageSize: 0,
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
    if (playbackState !== "playing") return;

    if (!autoAdvance) {
      const timer = window.setInterval(commitPending, screenCycleMs);
      return () => clearInterval(timer);
    }
    let switchTimer = 0;
    const timer = window.setTimeout(() => {
      setTransitioning(true);
      switchTimer = window.setTimeout(() => {
        commitPending();
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
  }, [autoAdvance, monitor.delaySeconds, playlist.length, screenIndex, screenCycleMs, commitPending, playbackState]);

  const stepPlaylist = (direction: -1 | 1) => {
    if (!playlist.length) return;
    commitPending();
    setTransitioning(false);
    setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000);
    setScreenIndex((current) => (current + direction + playlist.length) % playlist.length);
  };

  const stopPlayback = () => {
    setPlaybackState("stopped");
    commitPending();
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
    <MonitorBootScreen ccol={ccol} connectionState={connectionState} />
  ) : isRuleScreen ? (
    <GrupamentoRuleMonitorScreen screen={activeItem.screen} sag={sag} rpn={rpn} layout={monitor.layout} />
  ) : (
    <GrupamentoBaseMonitorScreen screen={activeItem.screen} sag={sag} rpn={rpn} layout={monitor.layout} page={activeItem.page} pageSize={activeItem.pageSize || undefined} />
  );

  return (
    <main
      className={`mcl-monitor-shell fixed inset-0 overscroll-none ${ccol ? "mcl-monitor-shell-ccol" : "mcl-monitor-shell-mcl"} flex h-[100dvh] min-h-0 flex-col overflow-hidden ${ccol ? "bg-[#f7f8fa] text-slate-950" : "bg-slate-950 text-white"}`}
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
            <BrandLogo className="h-8 w-8" tone={ccol ? "green" : "sky"} sizes="32px" />
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
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur ${connectionState === "offline"
              ? (ccol ? "border-amber-300 bg-amber-50 text-amber-700" : "border-amber-400/20 bg-amber-400/10 text-amber-300")
              : (ccol ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300")}`}
            title={connectionState === "offline" ? (Boolean(sag && rpn) || documentScenes.length > 0) ? "Sem conexão confirmada · último conteúdo local aprovado" : "Sem conexão confirmada · sem conteúdo local" : connectionState === "syncing" ? "Sincronizando atualizações" : "Online · sincronização ativa"}
            aria-label={connectionState === "offline" ? "Monitor offline" : "Monitor online"}
          >
            {connectionState === "offline" ? <WifiOff className="h-4 w-4" /> : <Wifi className={`h-4 w-4 ${connectionState === "syncing" ? "animate-pulse" : ""}`} />}
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
          className={`h-full w-full transition-[opacity,filter] ease-[cubic-bezier(0.22,1,0.36,1)] ${transitioning ? "opacity-95 blur-0" : "opacity-100 blur-0"}`}
          style={{ transitionDuration: `${SCREEN_FADE_MS}ms` }}
        >
          <div key={activeItem.key} className="mcl-monitor-scene h-full w-full">
            <MonitorViewport
              documentMode={(activeItem.kind === "document" && Boolean(activeItem.scene.payload.layout)) || !sag || !rpn}
              cycleSeconds={Math.max(5, monitor.delaySeconds)}
              paused={playbackState !== "playing"}
              onPageCount={onPageCount}
            >
              {screenContent}
            </MonitorViewport>
          </div>
        </div>
      </section>

      {playlist.length > 1 ? (
        <div className={`absolute bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur-md transition-opacity ${ccol ? "border-slate-300/70 bg-white/72 text-slate-700" : "border-white/10 bg-slate-950/62 text-slate-300"}`}>
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

      <button type="button" className="mcl-monitor-footer-toggle absolute bottom-1 left-2 z-50 rounded bg-slate-800/80 p-2 text-white" aria-controls="monitor-technical-band" aria-expanded={drawerOpen} aria-label="Mostrar ou ocultar informações do monitor" onClick={() => setDrawerOpen((open) => !open)}><ChevronUp className="h-4 w-4" /></button>
      <div className="mcl-monitor-footer-drawer absolute inset-x-0 bottom-0 z-50" data-open={drawerOpen} onKeyDown={(event) => { if (event.key === "Escape") setDrawerOpen(false); }}>

        <footer id="monitor-technical-band" className={`mcl-monitor-footer relative flex h-10 items-center justify-between gap-4 border-t px-7 text-[10px] backdrop-blur-xl ${ccol ? "border-slate-300/80 bg-white/92 text-slate-600" : "border-white/10 bg-slate-950/92 text-slate-400"}`}>
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Fonte: {activeItem.kind === "document" ? activeItem.scene.sourceFileName : (sag && rpn ? `${sag.source.fileName} + ${rpn.source.fileName}` : "aguardando sincronização")}</span>
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
            <span title={cacheIssue ?? undefined}>{cacheIssue ? "sincronização pendente" : "sync · 30s"}</span>
            <span>{connectionState === "offline" ? "cache local" : "online"}</span>
            <span>{safeIndex + 1}/{Math.max(1, playlist.length)}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function MonitorBootScreen({ ccol, connectionState }: { ccol: boolean; connectionState: "online" | "offline" | "syncing" }) {
  return (
    <div className="flex h-full min-h-[55vh] items-center justify-center">
      <div className="mcl-monitor-boot text-center">
        <div className={`mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] border backdrop-blur-xl ${ccol ? "border-sky-900/10 bg-white/55 shadow-[0_24px_70px_rgba(15,23,42,.10)]" : "border-sky-400/12 bg-slate-950/28 shadow-[0_24px_80px_rgba(14,165,233,.08)]"}`}>
          <BrandLogo className="h-28 w-28" tone={ccol ? "green" : "sky"} sizes="112px" />
        </div>
        <div className={`mt-7 text-[11px] font-black uppercase tracking-[0.34em] ${ccol ? "text-sky-900" : "text-sky-300"}`}>Modelo de Continuidade Logística</div>
        <div className={`mt-3 text-sm font-semibold ${ccol ? "text-slate-500" : "text-slate-500"}`}>
          {connectionState === "offline" ? "Aguardando fonte local validada" : "Inicializando quadro logístico"}
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
