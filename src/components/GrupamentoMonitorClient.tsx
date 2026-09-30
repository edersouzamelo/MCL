"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Clock3, Database, Pause, Play, ShieldCheck, SkipBack, SkipForward, Square, Wifi, WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GrupamentoClassSummaryScreen } from "@/components/GrupamentoClassSummaryScreen";
import { buildCcoClassSummary, CCO_SUMMARY_ROWS_PER_PAGE, summaryClassId } from "@/modules/grupamento/class-summary";
import { GrupamentoBaseMonitorScreen } from "@/components/GrupamentoBaseMonitorScreen";
import { GrupamentoRuleMonitorScreen } from "@/components/GrupamentoRuleMonitorScreen";
import { activeMonitorCorrection } from "@/modules/grupamento/monitor-content/correction";
import { latestBriefingUpdate } from "@/modules/grupamento/briefing";
import { BriefingFrame } from "@/components/BriefingFrame";
import { MonitorViewport } from "@/components/MonitorViewport";
import { forgetMonitorSnapshot, prepareMonitorNavigation, readMonitorSnapshot, synchronizeMonitor, type MonitorSnapshot } from "@/modules/grupamento/monitor-cache";
import { MonitorDocumentScene } from "@/components/MonitorDocumentScene";
import type { MonitorDocumentSceneDto } from "@/modules/grupamento/monitor-content/types";
import { CCO_RULE_SOURCE } from "@/modules/grupamento/cco";
import { formatMonitorSourceDate, sagMonitorProvenance } from "@/modules/grupamento/source-provenance";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult } from "@/modules/grupamento/sag";
import {
  CCO_MONITOR_COUNT,
  CCO_DEFAULT_LOOP_DELAY_SECONDS,
  CCO_PI_ROWS_PER_PAGE,
  CCO_SCREEN_CATALOG,
  CCO_UNIT_ROWS_PER_PAGE,
  defaultCcoMonitorConfig,
  type CcoMonitorConfig,
  type CcoScreenId,
} from "@/modules/grupamento/monitor";

const SCREEN_FADE_MS = 320;
const DATA_REFRESH_MS = 30_000;

function pageSizeForScreen(screen: CcoScreenId) {
  if (summaryClassId(screen)) return CCO_SUMMARY_ROWS_PER_PAGE;
  if (screen === "pis") return CCO_PI_ROWS_PER_PAGE;
  if (screen.startsWith("units-")) return CCO_UNIT_ROWS_PER_PAGE;
  return 0;
}

function normalizeMonitor(item: CcoMonitorConfig): CcoMonitorConfig {
  return {
    ...item,
    layout: item.layout ?? "mcl",
  };
}

export function GrupamentoMonitorClient({ monitorId, organizationId, canEnroll = false, buildVersion = "local", captureMode = false, initialCaptureFrame = 0 }: { monitorId: number; organizationId: string; canEnroll?: boolean; buildVersion?: string; captureMode?: boolean; initialCaptureFrame?: number }) {
  const [sag, setSag] = useState<SagImportResult | null>(null);
  const [rpn, setRpn] = useState<RpnImportResult | null>(null);
  const [documentScenes, setDocumentScenes] = useState<MonitorDocumentSceneDto[]>([]);
  const [monitor, setMonitor] = useState<CcoMonitorConfig>(() => defaultCcoMonitorConfig()[Math.max(0, Math.min(CCO_MONITOR_COUNT - 1, monitorId - 1))]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [screenCycleMs, setScreenCycleMs] = useState(CCO_DEFAULT_LOOP_DELAY_SECONDS * 1000);
  const [transitioning, setTransitioning] = useState(false);
  const [playbackState, setPlaybackState] = useState<"playing" | "paused" | "stopped">("playing");
  const [connectionState, setConnectionState] = useState<"online" | "offline" | "syncing">("syncing");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cacheIssue, setCacheIssue] = useState<string | null>(null);
  const [deviceMessage, setDeviceMessage] = useState("");
  const [deviceEnrolled, setDeviceEnrolled] = useState(false);
  const [captureFrame, setCaptureFrame] = useState(initialCaptureFrame);
  const activeVersion = useRef<string | null>(null);
  const activeSceneIds = useRef<string[]>([]);
  const pendingSnapshot = useRef<MonitorSnapshot | null>(null);
  const lastSnapshot = useRef<MonitorSnapshot | null>(null);
  const hasSnapshot = useRef(false);

  const applySnapshot = useCallback((snapshot: MonitorSnapshot) => {
    if (snapshot.version === activeVersion.current) return;
    activeVersion.current = snapshot.version;
    lastSnapshot.current = snapshot;
    activeSceneIds.current = snapshot.scenes.map((scene) => scene.id);
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
    let selected = defaultCcoMonitorConfig()[Math.max(0, Math.min(CCO_MONITOR_COUNT - 1, monitorId - 1))];
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
        if (!navigator.onLine) { setConnectionState("offline"); return; }
        // A revoked scene must disappear even when playback is paused.
        const snapshot = await synchronizeMonitor(organizationId, selected, lastSnapshot.current);
        if (cancelled) return;
        setCacheIssue(null);
        setConnectionState("online");
        const sceneIds = snapshot.scenes.map((scene) => scene.id);
        const playlistChanged = JSON.stringify(activeSceneIds.current) !== JSON.stringify(sceneIds);
        const configurationChanged = lastSnapshot.current && JSON.stringify(lastSnapshot.current.monitor) !== JSON.stringify(snapshot.monitor);
        if (!hasSnapshot.current || playlistChanged || configurationChanged) {
          pendingSnapshot.current = null;
          applySnapshot(snapshot);
          if (playlistChanged || configurationChanged) setPlaybackState("playing");
        } else pendingSnapshot.current = snapshot.version !== activeVersion.current ? snapshot : null;
        if (!navigationReady) { await prepareMonitorNavigation(monitorId); navigationReady = true; }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error && /HTTP (401|403)\b/.test(error.message)) {
            activeVersion.current = null;
            activeSceneIds.current = [];
            pendingSnapshot.current = null;
            lastSnapshot.current = null;
            hasSnapshot.current = false;
            setSag(null);
            setRpn(null);
            setDocumentScenes([]);
            void forgetMonitorSnapshot(organizationId, monitorId);
          }
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

  useEffect(() => {
    if (buildVersion === "local") return;
    const check = async () => {
      if (!navigator.onLine) return;
      try {
        const response = await fetch(`/api/grupamento/monitor-version?monitorId=${monitorId}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.version && payload.version !== buildVersion) window.location.reload();
      } catch { /* A próxima verificação ocorre com a rede restabelecida. */ }
    };
    const timer = window.setInterval(() => { void check(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [buildVersion, monitorId]);

  const commitPending = useCallback(() => {
    if (!pendingSnapshot.current) return;
    applySnapshot(pendingSnapshot.current);
    pendingSnapshot.current = null;
  }, [applySnapshot]);
  const onPageCount = useCallback((count: number) => {
    setScreenCycleMs(Math.max(5, monitor.delaySeconds) * 1000 * count);
  }, [monitor.delaySeconds]);

  type PlaylistItem =
    | { kind: "system"; key: string; screen: CcoScreenId; label: string; page: number; pageSize: number }
    | { kind: "document"; key: string; scene: MonitorDocumentSceneDto; label: string };

  const playlist = useMemo<PlaylistItem[]>(() => {
    const correction = activeMonitorCorrection(documentScenes);
    const systemItems = (!correction && sag && rpn ? monitor.screens : []).flatMap((screen) => {
      const pageSize = pageSizeForScreen(screen);
      let rowCount = 0;
      const summaryId = summaryClassId(screen);
      if (summaryId && sag) rowCount = buildCcoClassSummary(summaryId, sag.rows).byPi.length;
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
      ...(correction ?? documentScenes).map((scene) => ({
        kind: "document" as const,
        key: `document:${scene.id}`,
        scene,
        label: scene.title,
      })),
    ];
  }, [documentScenes, monitor.screens, rpn, sag]);

  const safeIndex = captureMode ? Math.min(captureFrame, Math.max(0, playlist.length - 1)) : Math.min(screenIndex, Math.max(0, playlist.length - 1));
  const activeItem = playlist[safeIndex] ?? null;
  const activeScreen = activeItem?.kind === "system" ? activeItem.screen : null;
  const screenLabel = activeItem?.label ?? "Sem conteúdo selecionado";
  const dataProvenance = useMemo(() => {
    if (!activeItem) return "Sem fonte ativa";
    if (activeItem.kind === "document") {
      return `Input: ${formatMonitorSourceDate(activeItem.scene.sourceImportedAt) ?? "data não identificada"} · ${activeItem.scene.sourceImportedByName ?? "responsável não identificado"}`;
    }
    return sagMonitorProvenance(sag?.source, rpn?.source);
  }, [activeItem, rpn?.source, sag?.source]);
  const effectiveLoop = monitor.mode === "loop" && playlist.length > 1;
  const autoAdvance = !captureMode && effectiveLoop && playbackState === "playing";

  useEffect(() => {
    if (!captureMode) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "MCL_CAPTURE_FRAME") return;
      const index = Number(event.data.frameIndex);
      if (!Number.isInteger(index) || index < 0 || index >= playlist.length) return;
      setCaptureFrame(index);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [captureMode, playlist.length]);

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

  async function enrollNotebook() {
    try {
      const response = await fetch("/api/grupamento/monitor-devices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitorId, label: `Notebook HDMI · Monitor ${monitorId}` }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao vincular notebook.");
      setDeviceEnrolled(true);
      setDeviceMessage("Notebook vinculado. Use o perfil normal do navegador na inicialização automática.");
    } catch (error) {
      setDeviceMessage(error instanceof Error ? error.message : "Falha ao vincular notebook.");
    }
  }

  const briefing = monitor.layout === "briefing";
  const ccol = monitor.layout !== "mcl";
  const activeSummaryClass = activeScreen ? summaryClassId(activeScreen) : undefined;
  const isRuleScreen = activeScreen ? activeScreen === "briefing" || activeScreen.startsWith("class-") : false;
  const documentFillsFrame = activeItem?.kind === "document" && Boolean(activeItem.scene.payload.layout ||
    (activeItem.scene.payload.columns && activeItem.scene.payload.rows && !activeItem.scene.payload.chart && !activeItem.scene.payload.assetIds?.length));

  const screenContent = !monitor.enabled ? (
    <Empty ccol={ccol} title="Monitor desativado" description="Ative esta saída na matriz do CCOL para voltar a exibir conteúdo." />
  ) : !activeItem ? (
    <Empty ccol={ccol} title="Sem conteúdo selecionado" description="Selecione uma tela SAG ou aprove conteúdo documental para esta saída." />
  ) : activeItem.kind === "document" ? (
    <MonitorDocumentScene scene={activeItem.scene} ccol={ccol} briefing={briefing} cycleSeconds={Math.max(5, monitor.delaySeconds)} paused={captureMode || playbackState !== "playing"} onPageCount={onPageCount} />
  ) : !sag || !rpn ? (
    <MonitorBootScreen ccol={ccol} connectionState={connectionState} />
  ) : activeSummaryClass ? (
    <GrupamentoClassSummaryScreen classId={activeSummaryClass} sag={sag} layout={briefing ? "ccol" : monitor.layout} page={activeItem.page} />
  ) : isRuleScreen ? (
    <GrupamentoRuleMonitorScreen screen={activeItem.screen} sag={sag} rpn={rpn} layout={briefing ? "ccol" : monitor.layout} />
  ) : (
    <GrupamentoBaseMonitorScreen screen={activeItem.screen} sag={sag} rpn={rpn} layout={briefing ? "ccol" : monitor.layout} page={activeItem.page} pageSize={activeItem.pageSize || undefined} />
  );

  if (monitor.enabled && activeItem?.kind === "document" && activeItem.scene.payload.correction?.fullFrame) return <main data-mcl-capture-root="1" data-mcl-capture-ready={captureMode && !transitioning ? "1" : "0"} data-mcl-playlist-count={playlist.length} data-mcl-frame-index={safeIndex} data-mcl-frame-label={screenLabel} className="fixed inset-0 overflow-hidden bg-black" style={{ opacity: transitioning ? 0 : 1, transition: `opacity ${SCREEN_FADE_MS}ms` }}>
    <MonitorDocumentScene scene={activeItem.scene} ccol={ccol} briefing />
  </main>;

  if (briefing) return <BriefingFrame monitorId={monitorId} responsibleSector={monitor.responsibleSector} captureReady={Boolean(captureMode && activeItem && !transitioning)} playlistCount={playlist.length} frameIndex={safeIndex} frameLabel={screenLabel} updatedAt={activeItem?.kind === "document" ? activeItem.scene.sourceImportedAt : activeScreen === "rpn" || activeScreen?.startsWith("units-rpn-") ? rpn?.source.importedAt : latestBriefingUpdate(sag?.source.importedAt, rpn?.source.importedAt)}>
    <div key={activeItem?.key ?? "empty"} className="h-full w-full" style={{ opacity: transitioning ? 0 : 1, transition: `opacity ${SCREEN_FADE_MS}ms` }}>
      <MonitorViewport fillFrame={activeItem?.kind === "system" && Boolean(sag && rpn)} documentMode={!activeItem || documentFillsFrame || !sag || !rpn} cycleSeconds={Math.max(5, monitor.delaySeconds)} paused={captureMode || playbackState !== "playing"} onPageCount={activeItem?.kind === "system" ? onPageCount : undefined}>{screenContent}</MonitorViewport>
    </div>
  </BriefingFrame>;

  return (
    <main
      data-mcl-capture-root="1"
      data-mcl-capture-ready={captureMode && activeItem && !transitioning ? "1" : "0"}
      data-mcl-playlist-count={playlist.length}
      data-mcl-frame-index={safeIndex}
      data-mcl-frame-label={screenLabel}
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
        <div className="flex shrink-0 items-center gap-4 text-right">
          <div className={`max-w-[360px] truncate text-[10px] font-bold uppercase tracking-[0.12em] ${ccol ? "text-slate-600" : "text-slate-300"}`} title={dataProvenance}>
            {dataProvenance}
          </div>
          <MonitorClock ccol={ccol} />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur ${captureMode || connectionState === "offline"
              ? (ccol ? "border-amber-300 bg-amber-50 text-amber-700" : "border-amber-400/20 bg-amber-400/10 text-amber-300")
              : (ccol ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300")}`}
            title={captureMode ? "Artefato de exportação offline" : connectionState === "offline" ? (Boolean(sag && rpn) || documentScenes.length > 0) ? "Sem conexão confirmada · último conteúdo local aprovado" : "Sem conexão confirmada · sem conteúdo local" : connectionState === "syncing" ? "Sincronizando atualizações" : "Online · sincronização ativa"}
            aria-label={captureMode ? "Exportação offline" : connectionState === "offline" ? "Monitor offline" : "Monitor online"}
          >
            {captureMode || connectionState === "offline" ? <WifiOff className="h-4 w-4" /> : <Wifi className={`h-4 w-4 ${connectionState === "syncing" ? "animate-pulse" : ""}`} />}
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
          className={`h-full w-full transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)] ${transitioning ? "opacity-0" : "opacity-100"}`}
          style={{ transitionDuration: `${SCREEN_FADE_MS}ms` }}
        >
          <div key={activeItem?.key ?? "empty-playlist"} className="mcl-monitor-scene h-full w-full">
            <MonitorViewport
              fillFrame={activeItem?.kind === "system" && Boolean(sag && rpn)}
              documentMode={!activeItem || documentFillsFrame || !sag || !rpn}
              cycleSeconds={Math.max(5, monitor.delaySeconds)}
              paused={captureMode || playbackState !== "playing"}
              onPageCount={activeItem?.kind === "document" || !activeItem ? undefined : onPageCount}
            >
              {screenContent}
            </MonitorViewport>
          </div>
        </div>
      </section>

      {playlist.length > 1 && !captureMode ? (
        <div className={`absolute bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur-md transition-opacity ${ccol ? "border-slate-300/70 bg-white/72 text-slate-700" : "border-white/10 bg-slate-950/62 text-slate-300"}`}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => stepPlaylist(-1)} className="rounded-full p-2 transition hover:bg-sky-400/10 hover:text-sky-300" aria-label="Voltar quadro" title="Voltar"><SkipBack className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => {
                setTransitioning(false);
                setPlaybackState((state) => state === "playing" ? "paused" : "playing");
              }}
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

      {!captureMode ? <button type="button" className="mcl-monitor-footer-toggle absolute bottom-1 left-2 z-50 rounded bg-slate-800/80 p-2 text-white" aria-controls="monitor-technical-band" aria-expanded={drawerOpen} aria-label="Mostrar ou ocultar informações do monitor" onClick={() => setDrawerOpen((open) => !open)}><ChevronUp className="h-4 w-4" /></button> : null}
      {!captureMode ? <div className="mcl-monitor-footer-drawer absolute inset-x-0 bottom-0 z-50" data-open={drawerOpen} onKeyDown={(event) => { if (event.key === "Escape") setDrawerOpen(false); }}>

        <footer id="monitor-technical-band" className={`mcl-monitor-footer relative flex h-10 items-center justify-between gap-4 border-t px-7 text-[10px] backdrop-blur-xl ${ccol ? "border-slate-300/80 bg-white/92 text-slate-600" : "border-white/10 bg-slate-950/92 text-slate-400"}`}>
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Fonte: {!activeItem ? "nenhuma" : activeItem.kind === "document" ? activeItem.scene.sourceFileName : (sag && rpn ? `${sag.source.fileName} + ${rpn.source.fileName}` : "aguardando sincronização")}</span>
            </span>
            {activeItem?.kind === "system" ? (
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
            {canEnroll && !deviceEnrolled ? <button type="button" onClick={() => void enrollNotebook()} className="rounded border border-sky-500 px-1.5 py-0.5 font-bold text-sky-400" title="Permitir que este navegador reabra o monitor sem novo login">Vincular notebook</button> : null}
            {deviceMessage ? <span className="max-w-64 truncate" title={deviceMessage}>{deviceMessage}</span> : null}
            <span>{monitor.layout === "ccol" ? "layout CCOL" : "layout MCL"}</span>
            <span>{effectiveLoop ? `loop · ${monitor.delaySeconds}s · ${playbackState === "playing" ? "rodando" : playbackState === "paused" ? "pausado" : "parado"}` : "tela fixa"}</span>
            <span title={cacheIssue ?? undefined}>{cacheIssue ? "sincronização pendente" : "sync · 30s"}</span>
            <span>{connectionState === "offline" ? "cache local" : "online"}</span>
            <span>{safeIndex + 1}/{Math.max(1, playlist.length)}</span>
          </div>
        </footer>
      </div> : null}
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

// Keep one-second clock updates outside the scene and its charts.
function MonitorClock({ ccol }: { ccol: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div>
      <div suppressHydrationWarning className="font-mono text-base font-bold">{now.toLocaleTimeString("pt-BR")}</div>
      <div suppressHydrationWarning className={ccol ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>{now.toLocaleDateString("pt-BR")}</div>
    </div>
  );
}
