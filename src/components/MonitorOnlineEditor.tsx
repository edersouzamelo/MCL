"use client";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  Save,
  Undo2,
  Redo2,
  Trash2,
  Type,
  ImagePlus,
  Square,
  Eye,
  Send,
  Layers,
  Copy,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  MonitorDocumentLayout,
  MonitorDocumentScene,
} from "./MonitorDocumentScene";
import { MonitorTitleFrame } from "./MonitorTitleFrame";
import { MonitorContentCockpit } from "./MonitorContentCockpit";
import {
  editorRevision,
  prepareEditorScene,
  optimizeEditorElements,
  type EditorScene,
} from "@/modules/grupamento/monitor-content/online-editor";
import {
  EDITOR_LAYOUTS,
  proposeEditorLayout,
  applyPatches,
  diffContent,
  editorPreflight,
  RESIZE_HANDLES,
  resizeSelection,
  selectionBounds,
  snapSelection,
  type EditorContent,
  type EditorPatch,
  type ResizeHandle,
} from "@/modules/grupamento/monitor-content/editor-model";
import {
  monitorIntegralImage,
  normalizeMonitorTitle,
} from "@/modules/grupamento/monitor-content/presentation-title";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";
import "./monitor-online-editor.css";

type HistoryEntry = {
  sceneId: string;
  patches: EditorPatch[];
  key?: string;
  at: number;
};
type Draft = {
  sceneId: string;
  revision: number;
  baseRevision: number;
  content: EditorContent;
};
type Version = { id: string; createdAt: string; actorId: string; kind: string };
const content = (s: EditorScene): EditorContent => ({
  title: s.title,
  elements: s.payload.layout?.elements ?? [],
});
const withContent = (s: EditorScene, c: EditorContent): EditorScene => ({
  ...s,
  title: c.title,
  payload: {
    ...s.payload,
    layout: {
      version: 2,
      width: s.payload.layout?.width ?? 12192000,
      height: s.payload.layout?.height ?? 6858000,
      elements: c.elements,
    },
  },
});
const labels = {
  text: "texto",
  image: "imagem",
  chart: "gráfico",
  table: "tabela",
  shape: "forma",
};
const Thumbnail = memo(function Thumbnail({
  scene,
  selected,
  changed,
  onSelect,
}: {
  scene: EditorScene;
  selected: boolean;
  changed: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { rootMargin: "180px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      className={selected ? "selected" : ""}
      onClick={() => onSelect(scene.id)}
      title={scene.title}
    >
      <span>
        {scene.sceneOrder + 1}. {scene.title}
        {changed ? " •" : ""}
      </span>
      <div className="mcl-editor-thumbnail">
        {(visible || selected) && (
          <MonitorDocumentScene scene={scene} ccol briefing paused />
        )}
      </div>
    </button>
  );
});
export function MonitorOnlineEditor({
  monitorId,
  currentUserName,
  storageScope = "session",
}: {
  monitorId: number;
  currentUserName: string;
  storageScope?: string;
}) {
  const [scenes, setScenes] = useState<EditorScene[]>([]),
    [slideId, setSlideId] = useState("");
  const [selected, select] = useState<string[]>([]),
    [inline, setInline] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]),
    [future, setFuture] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set()),
    [unpublished, setUnpublished] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(100),
    [preview, setPreview] = useState(false),
    [imports, showImports] = useState(false);
  const [showLayers, setShowLayers] = useState(true),
    [grid, setGrid] = useState(false),
    [snap, setSnap] = useState(true),
    [safe, setSafe] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]),
    [showVersions, setShowVersions] = useState(false),
    [alignment, setAlignment] = useState<"selection" | "slide">("selection");
  const [proposal, setProposal] = useState<MonitorSlideElement[] | null>(null),
    [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [guides, setGuides] = useState<
      Array<{ axis: "x" | "y"; value: number }>
    >([]),
    [marquee, setMarquee] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
    } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set()),
    [tablePage, setTablePage] = useState(0),
    [localRecovery, setLocalRecovery] = useState<Draft[] | null>(null);
  const scenesRef = useRef(scenes),
    historyRef = useRef(history),
    futureRef = useRef(future),
    dirtyRef = useRef(dirtyIds);
  const revisions = useRef(new Map<string, number>()),
    savedContent = useRef(new Map<string, EditorContent>());
  const published = useRef(new Map<string, EditorScene>()),
    saving = useRef(false),
    clipboard = useRef<{
      importId: string;
      elements: MonitorSlideElement[];
    } | null>(null);
  const imageInput = useRef<HTMLInputElement>(null),
    replaceImage = useRef(false),
    scroll = useRef<HTMLDivElement>(null);
  const movement = useRef<{
    sceneId: string;
    before: EditorContent;
    ids: string[];
    x: number;
    y: number;
    width: number;
    height: number;
    handle?: ResizeHandle;
    rotate?: boolean;
  } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const localKey = `mcl-editor-draft-v2:${storageScope}:${monitorId}`;
  const scene = scenes.find((s) => s.id === slideId),
    elements = scene?.payload.layout?.elements ?? [];
  const chosen = elements.filter((e) => selected.includes(e.elementId!)),
    item = chosen.length === 1 ? chosen[0] : null;
  const bounds = chosen.length ? selectionBounds(chosen) : null;
  const compiler = scene?.payload.inputCompiler;
  const issues = scene
    ? [
        ...editorPreflight(content(scene)),
        ...(compiler?.preflight.issues ?? []).map((issue) => ({
          id: issue.nodeIds[0] ?? "$scene",
          message: issue.message,
          severity:
            compiler?.preflight.status === "BLOCKED"
              ? ("error" as const)
              : ("warning" as const),
        })),
        ...(compiler && compiler.interpretedContent.confidence < 0.7
          ? [
              {
                id: "$scene",
                message:
                  "Interpretação incerta: compare com a fonte antes de publicar.",
                severity: "warning" as const,
              },
            ]
          : []),
      ]
    : [];
  const setAll = useCallback((next: EditorScene[]) => {
    scenesRef.current = next;
    setScenes(next);
  }, []);
  const markDirty = (id: string) => {
    const next = new Set(dirtyRef.current).add(id);
    dirtyRef.current = next;
    setDirtyIds(next);
    setUnpublished((previous) => new Set(previous).add(id));
  };
  const selectSlide = useCallback((id: string) => {
    setSlideId(id);
    select([]);
    setInline(null);
    setTablePage(0);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/grupamento/monitors/${monitorId}/editor`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Não foi possível abrir os documentos.",
        );
      const prepared = (result.scenes as EditorScene[]).map(prepareEditorScene),
        drafts = (result.drafts ?? []) as Draft[];
      published.current = new Map(prepared.map((s) => [s.id, s]));
      revisions.current = new Map(drafts.map((d) => [d.sceneId, d.revision]));
      const next = prepared.map((s) => {
        const draft = drafts.find((d) => d.sceneId === s.id);
        return draft ? withContent(s, draft.content) : s;
      });
      savedContent.current = new Map(next.map((s) => [s.id, content(s)]));
      setAll(next);
      setSlideId((previous) =>
        next.some((s) => s.id === previous) ? previous : (next[0]?.id ?? ""),
      );
      setHistory([]);
      historyRef.current = [];
      setFuture([]);
      futureRef.current = [];
      select([]);
      dirtyRef.current = new Set();
      setDirtyIds(new Set());
      setUnpublished(new Set(drafts.map((d) => d.sceneId)));
      setVersions(result.versions ?? []);
      setError("");
      setMessage(
        drafts.length
          ? "Rascunho salvo · Alterações não publicadas"
          : "Publicado",
      );
      try {
        const local = JSON.parse(localStorage.getItem(localKey) ?? "null");
        if (Array.isArray(local) && local.length) setLocalRecovery(local);
      } catch {
        /* No recoverable local draft. */
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [monitorId, localKey, setAll]);
  // Synchronize with persisted documentary state on entry.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);
  function record(
    sceneId: string,
    before: EditorContent,
    after: EditorContent,
    key?: string,
  ) {
    const patches = diffContent(before, after);
    if (!patches.length) return;
    // Invoked only by edit handlers and completed pointer interactions, never during render.
    // eslint-disable-next-line react-hooks/purity
    const entry = { sceneId, patches, key, at: Date.now() },
      last = historyRef.current.at(-1);
    let next = [...historyRef.current, entry];
    if (
      key &&
      last?.key === key &&
      last.sceneId === sceneId &&
      entry.at - last.at < 900
    ) {
      const original = applyPatches(before, last.patches, true);
      next = [
        ...historyRef.current.slice(0, -1),
        { ...entry, patches: diffContent(original, after) },
      ];
    }
    historyRef.current = next.slice(-150);
    setHistory(historyRef.current);
    futureRef.current = [];
    setFuture([]);
    markDirty(sceneId);
  }
  function update(next: EditorContent, key?: string) {
    const current = scenesRef.current.find((s) => s.id === slideId);
    if (!current || busy) return;
    record(current.id, content(current), next, key);
    setAll(
      scenesRef.current.map((s) =>
        s.id === current.id ? withContent(s, next) : s,
      ),
    );
  }
  function changeElements(next: MonitorSlideElement[], key?: string) {
    if (scene) update({ title: scene.title, elements: next }, key);
  }
  function patchSelected(patch: Partial<MonitorSlideElement>, key?: string) {
    changeElements(
      elements.map((e) =>
        selected.includes(e.elementId!) && !e.locked
          ? ({ ...e, ...patch } as MonitorSlideElement)
          : e,
      ),
      key,
    );
  }
  function undoEdit(redo = false) {
    if (busy) return;
    const entry = (redo ? futureRef : historyRef).current.at(-1);
    if (!entry) return;
    const current = scenesRef.current.find((s) => s.id === entry.sceneId);
    if (!current) return;
    setAll(
      scenesRef.current.map((s) =>
        s.id === entry.sceneId
          ? withContent(s, applyPatches(content(s), entry.patches, !redo))
          : s,
      ),
    );
    if (redo) {
      futureRef.current = futureRef.current.slice(0, -1);
      historyRef.current = [...historyRef.current, entry];
    } else {
      historyRef.current = historyRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, entry];
    }
    setHistory(historyRef.current);
    setFuture(futureRef.current);
    markDirty(entry.sceneId);
    setSlideId(entry.sceneId);
    setInline(null);
    const liveIds = new Set(
      scenesRef.current
        .find((s) => s.id === entry.sceneId)
        ?.payload.layout?.elements.map((e) => e.elementId),
    );
    select(
      [...new Set(entry.patches.map((p) => p.id))].filter((id) =>
        liveIds.has(id),
      ),
    );
  }
  function add(e: MonitorSlideElement) {
    e = { ...e, elementId: crypto.randomUUID() };
    changeElements([...elements, e]);
    select([e.elementId!]);
    setPreview(false);
  }
  function deleteSelected() {
    const ids = new Set(
      chosen.filter((e) => !e.locked).map((e) => e.elementId),
    );
    changeElements(
      elements
        .filter((e) => !ids.has(e.elementId))
        .map((e) =>
          e.attachedTo && ids.has(e.attachedTo)
            ? { ...e, attachedTo: undefined }
            : e,
        ),
    );
    select([]);
  }
  function copy(cut = false) {
    if (!scene || !chosen.length) return;
    clipboard.current = {
      importId: scene.importId,
      elements: structuredClone(chosen),
    };
    if (cut) deleteSelected();
  }
  function paste(duplicate = false) {
    const source = duplicate
      ? { importId: scene?.importId, elements: chosen }
      : clipboard.current;
    if (!source?.elements.length || !scene) return;
    if (
      source.importId !== scene.importId &&
      source.elements.some((e) => e.kind === "image")
    ) {
      setError("Imagens só podem ser coladas dentro do mesmo documento.");
      return;
    }
    const ids = new Map(
      source.elements.map((e) => [e.elementId!, crypto.randomUUID()]),
    );
    const groups = new Map(
      source.elements
        .filter((e) => e.groupId)
        .map((e) => [e.groupId!, crypto.randomUUID()]),
    );
    const maxZ = Math.max(0, ...elements.map((e) => e.z));
    const copies = source.elements.map((e, i) => ({
      ...structuredClone(e),
      elementId: ids.get(e.elementId!)!,
      groupId: e.groupId ? groups.get(e.groupId) : undefined,
      attachedTo: e.attachedTo
        ? (ids.get(e.attachedTo) ??
          (source.importId === scene.importId ? e.attachedTo : undefined))
        : undefined,
      x: e.x + 0.02,
      y: e.y + 0.02,
      z: Math.min(1000, maxZ + i + 1),
      locked: false,
    }));
    changeElements([...elements, ...copies]);
    select(copies.map((e) => e.elementId!));
  }
  function group(ungroup = false) {
    const groupId = ungroup ? undefined : crypto.randomUUID();
    patchSelected({ groupId });
  }
  function zOrder(mode: "front" | "back" | "up" | "down") {
    let sorted = [...elements].sort((a, b) => a.z - b.z);
    const ids = new Set(selected);
    if (mode === "front")
      sorted = [
        ...sorted.filter((e) => !ids.has(e.elementId!)),
        ...sorted.filter((e) => ids.has(e.elementId!)),
      ];
    if (mode === "back")
      sorted = [
        ...sorted.filter((e) => ids.has(e.elementId!)),
        ...sorted.filter((e) => !ids.has(e.elementId!)),
      ];
    if (mode === "up")
      for (let i = sorted.length - 2; i >= 0; i--)
        if (ids.has(sorted[i].elementId!) && !ids.has(sorted[i + 1].elementId!))
          [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
    if (mode === "down")
      for (let i = 1; i < sorted.length; i++)
        if (ids.has(sorted[i].elementId!) && !ids.has(sorted[i - 1].elementId!))
          [sorted[i], sorted[i - 1]] = [sorted[i - 1], sorted[i]];
    changeElements(sorted.map((e, i) => ({ ...e, z: i + 1 })));
  }
  function align(mode: string) {
    if (!bounds || !chosen.length) return;
    const target = alignment === "slide" ? { x: 0, y: 0, w: 1, h: 1 } : bounds;
    const changed = chosen.filter((e) => !e.locked).map((e) => ({ ...e }));
    if (mode.startsWith("distribute")) {
      if (changed.length < 3) return;
      const axis = mode.endsWith("x") ? "x" : "y",
        size = axis === "x" ? "w" : "h";
      changed.sort((a, b) => a[axis] - b[axis]);
      const first = changed[0],
        last = changed.at(-1)!,
        gap =
          (last[axis] +
            last[size] -
            first[axis] -
            changed.reduce((sum, e) => sum + e[size], 0)) /
          (changed.length - 1);
      let cursor = first[axis];
      for (const e of changed) {
        e[axis] = cursor;
        cursor += e[size] + gap;
      }
    } else
      for (const e of changed) {
        if (mode === "left") e.x = target.x;
        if (mode === "center") e.x = target.x + (target.w - e.w) / 2;
        if (mode === "right") e.x = target.x + target.w - e.w;
        if (mode === "top") e.y = target.y;
        if (mode === "middle") e.y = target.y + (target.h - e.h) / 2;
        if (mode === "bottom") e.y = target.y + target.h - e.h;
      }
    changeElements(
      elements.map(
        (e) => changed.find((c) => c.elementId === e.elementId) ?? e,
      ),
    );
  }
  function idsFor(e: MonitorSlideElement) {
    const ids = e.groupId
      ? elements
          .filter((other) => other.groupId === e.groupId)
          .map((other) => other.elementId!)
      : [e.elementId!];
    for (const other of elements)
      if (other.attachedTo && ids.includes(other.attachedTo))
        ids.push(other.elementId!);
    return ids;
  }
  function startMove(
    event: PointerEvent<HTMLElement>,
    e?: MonitorSlideElement,
    handle?: ResizeHandle,
    rotate = false,
  ) {
    if (!scene || busy || preview || inline || e?.locked || event.button !== 0)
      return;
    event.preventDefault();
    event.stopPropagation();
    setContext(null);
    let ids = selected;
    if (e) {
      const clicked = idsFor(e);
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        select(
          selected.includes(e.elementId!)
            ? selected.filter((id) => !clicked.includes(id))
            : [...new Set([...selected, ...clicked])],
        );
        return;
      }
      if (!selected.includes(e.elementId!)) ids = clicked;
    }
    ids = ids.filter(
      (id) => !elements.find((el) => el.elementId === id)?.locked,
    );
    select(ids);
    const overlay = event.currentTarget.closest(".mcl-editor-overlay")!;
    const b = overlay.getBoundingClientRect();
    movement.current = {
      sceneId: scene.id,
      before: content(scene),
      ids,
      x: event.clientX,
      y: event.clientY,
      width: b.width,
      height: b.height,
      handle,
      rotate,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLElement>) {
    const m = movement.current;
    if (!m) return;
    const dx = (event.clientX - m.x) / m.width,
      dy = (event.clientY - m.y) / m.height;
    const originals = m.before.elements.filter((e) =>
      m.ids.includes(e.elementId!),
    );
    let next: MonitorSlideElement[];
    if (m.rotate)
      next = originals.map((e) => ({
        ...e,
        rotation: event.shiftKey
          ? Math.round(((e.rotation ?? 0) + dx * 360) / 15) * 15
          : (e.rotation ?? 0) + dx * 360,
      }));
    else if (m.handle)
      next = resizeSelection(
        originals,
        m.handle,
        dx,
        dy,
        event.shiftKey ||
          (originals.every((e) => e.kind === "image") && !event.altKey),
      );
    else next = originals.map((e) => ({ ...e, x: e.x + dx, y: e.y + dy }));
    if (snap && !event.altKey && !m.handle && !m.rotate) {
      const result = snapSelection(
        next,
        m.before.elements.filter((e) => !m.ids.includes(e.elementId!)),
        6 / m.width,
      );
      next = result.elements;
      setGuides(result.guides);
    } else setGuides([]);
    setAll(
      scenesRef.current.map((s) =>
        s.id === m.sceneId
          ? withContent(s, {
              ...m.before,
              elements: m.before.elements.map(
                (e) => next.find((n) => n.elementId === e.elementId) ?? e,
              ),
            })
          : s,
      ),
    );
  }
  function finishMove(cancel = false) {
    const m = movement.current;
    if (!m) return;
    movement.current = null;
    setGuides([]);
    const current = scenesRef.current.find((s) => s.id === m.sceneId)!;
    if (cancel)
      setAll(
        scenesRef.current.map((s) =>
          s.id === m.sceneId ? withContent(s, m.before) : s,
        ),
      );
    else record(m.sceneId, m.before, content(current));
  }
  function marqueeEvent(
    event: PointerEvent<HTMLDivElement>,
    phase: "start" | "move" | "end",
  ) {
    if (
      (event.target !== event.currentTarget && phase === "start") ||
      movement.current ||
      preview ||
      busy
    )
      return;
    const b = event.currentTarget.getBoundingClientRect(),
      p = {
        x: (event.clientX - b.x) / b.width,
        y: (event.clientY - b.y) / b.height,
      };
    if (phase === "start") {
      marqueeStart.current = p;
      select([]);
      setInline(null);
      setContext(null);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const a = marqueeStart.current;
    if (!a) return;
    const box = {
      x: Math.min(a.x, p.x),
      y: Math.min(a.y, p.y),
      w: Math.abs(p.x - a.x),
      h: Math.abs(p.y - a.y),
    };
    if (phase === "move") setMarquee(box);
    if (phase === "end") {
      select(
        elements
          .filter(
            (e) =>
              !e.locked &&
              !hidden.has(e.elementId!) &&
              e.x >= box.x &&
              e.y >= box.y &&
              e.x + e.w <= box.x + box.w &&
              e.y + e.h <= box.y + box.h,
          )
          .map((e) => e.elementId!),
      );
      marqueeStart.current = null;
      setMarquee(null);
    }
  }
  const save = useCallback(async () => {
    if (saving.current || movement.current || !dirtyRef.current.size)
      return false;
    saving.current = true;
    setMessage("Salvando...");
    setError("");
    const ids = new Set(dirtyRef.current),
      snapshot = scenesRef.current.filter((s) => ids.has(s.id));
    const local = snapshot.map((s) => ({
      sceneId: s.id,
      revision: revisions.current.get(s.id) ?? 0,
      baseRevision: editorRevision(s),
      content: content(s),
    }));
    try {
      localStorage.setItem(localKey, JSON.stringify(local));
    } catch {
      /* Server save remains possible. */
    }
    try {
      const response = await fetch(
        `/api/grupamento/monitors/${monitorId}/editor`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: snapshot.map((s) => ({
              id: s.id,
              revision: editorRevision(s),
              draftRevision: revisions.current.get(s.id) ?? 0,
              ...content(s),
            })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Falha ao salvar rascunho.");
      for (const row of result.saved as Array<{
        sceneId: string;
        revision: number;
      }>)
        revisions.current.set(row.sceneId, row.revision);
      const remaining = new Set(dirtyRef.current);
      for (const s of snapshot) {
        savedContent.current.set(s.id, content(s));
        if (scenesRef.current.find((current) => current.id === s.id) === s)
          remaining.delete(s.id);
      }
      dirtyRef.current = remaining;
      setDirtyIds(remaining);
      if (!remaining.size) {
        try {
          localStorage.removeItem(localKey);
        } catch {
          /* Server receipt already confirmed. */
        }
      }
      setMessage("Rascunho salvo · Alterações não publicadas");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
      setMessage("Rascunho não sincronizado com o servidor");
      return false;
    } finally {
      saving.current = false;
    }
  }, [monitorId, localKey]);
  useEffect(() => {
    if (!dirtyIds.size) return;
    const timer = setTimeout(() => {
      void save();
    }, 1400);
    return () => clearTimeout(timer);
  }, [dirtyIds, save]);
  useEffect(() => {
    const retry = () => {
      void save();
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [save]);
  async function publish() {
    if (busy || saving.current) return;
    setBusy(true);
    if (dirtyRef.current.size && !(await save())) {
      setBusy(false);
      return;
    }
    if (dirtyRef.current.size) {
      setBusy(false);
      setError("Há novas alterações locais. Salve antes de publicar.");
      return;
    }
    const ids = [...unpublished].filter((id) => revisions.current.has(id));
    if (!ids.length) {
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/grupamento/monitors/${monitorId}/editor`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: ids.map((id) => ({
              id,
              draftRevision: revisions.current.get(id),
            })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Falha na publicação.");
      const next = (result.scenes as EditorScene[]).map(prepareEditorScene);
      setAll(next);
      published.current = new Map(next.map((s) => [s.id, s]));
      revisions.current.clear();
      setUnpublished(new Set());
      setMessage("Publicado");
      // Undo history is retained; publication revisions are carried by fresh scenes.
      window.dispatchEvent(
        new CustomEvent("mcl-grupamento-document-content-updated"),
      );
      try {
        localStorage.setItem(
          "mcl-document-content-change",
          JSON.stringify({ monitorId, at: Date.now() }),
        );
      } catch {
        /* Publication already succeeded. */
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na publicação.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage(file?: File, point?: { x: number; y: number }) {
    if (!file || !scene) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("sceneId", scene.id);
      const response = await fetch(
        `/api/grupamento/monitors/${monitorId}/editor/images`,
        { method: "POST", body: form },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const replacement = replaceImage.current && item?.kind === "image";
      const image: MonitorSlideElement = replacement
        ? { ...item, assetId: result.assetId }
        : {
            kind: "image",
            elementId: crypto.randomUUID(),
            assetId: result.assetId,
            x: point?.x ?? 0.1,
            y: point?.y ?? 0.1,
            w: 0.4,
            h: Math.min(
              0.7,
              (0.4 *
                (scene.payload.layout!.width / scene.payload.layout!.height) *
                (result.height ?? 1)) /
                (result.width ?? 1),
            ),
            z: Math.min(1000, Math.max(0, ...elements.map((e) => e.z)) + 1),
          };
      const next = {
        ...content(scene),
        elements: replacement
          ? elements.map((e) => (e.elementId === item.elementId ? image : e))
          : [...elements, image],
      };
      record(scene.id, content(scene), next);
      setAll(
        scenesRef.current.map((s) =>
          s.id === scene.id ? withContent(s, next) : s,
        ),
      );
      select([image.elementId!]);
      setPreview(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao adicionar imagem.",
      );
    } finally {
      setBusy(false);
      replaceImage.current = false;
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  // Shortcuts are scoped to the editor and never intercept native text editing.
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement).closest(
        "input,textarea,select,[contenteditable=true]",
      );
      const cmd = e.ctrlKey || e.metaKey,
        k = e.key.toLowerCase();
      if (cmd && k === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (e.key === "Escape") {
        setInline(null);
        select([]);
        setContext(null);
        setProposal(null);
        return;
      }
      if (typing || busy || preview) return;
      if (cmd && ["z", "y", "a", "c", "x", "d", "g"].includes(k)) {
        e.preventDefault();
        if (k === "z") undoEdit(e.shiftKey);
        if (k === "y") undoEdit(true);
        if (k === "a")
          select(
            elements
              .filter((el) => !el.locked && !hidden.has(el.elementId!))
              .map((el) => el.elementId!),
          );
        if (k === "c") copy();
        if (k === "x") copy(true);
        if (k === "d") paste(true);
        if (k === "g") group(e.shiftKey);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key.startsWith("Arrow") && chosen.length) {
        e.preventDefault();
        const step = e.shiftKey ? 0.01 : 0.001;
        changeElements(
          elements.map((el) =>
            selected.includes(el.elementId!) && !el.locked
              ? {
                  ...el,
                  x:
                    el.x +
                    (e.key === "ArrowRight"
                      ? step
                      : e.key === "ArrowLeft"
                        ? -step
                        : 0),
                  y:
                    el.y +
                    (e.key === "ArrowDown"
                      ? step
                      : e.key === "ArrowUp"
                        ? -step
                        : 0),
                }
              : el,
          ),
          "nudge",
        );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const base = {
    x: 0.1,
    y: 0.1,
    w: 0.4,
    h: 0.2,
    z: Math.min(1000, Math.max(0, ...elements.map((e) => e.z)) + 1),
  };
  const tool = "mcl-editor-tool";
  const visibleScene = scene
    ? withContent(scene, {
        title: scene.title,
        elements:
          proposal ??
          elements.filter((e) => preview || !hidden.has(e.elementId!)),
      })
    : null;
  return (
    <main
      className={`mcl-online-editor ${preview ? "is-preview" : ""}`}
      onPaste={(e) => {
        if ((e.target as HTMLElement).closest("input,textarea")) return;
        const image = Array.from(e.clipboardData.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (image) {
          e.preventDefault();
          void uploadImage(image);
        } else { e.preventDefault(); paste(); }
      }}
    >
      <header className="mcl-editor-header">
        <div>
          <h1>
            Editor MCL <span>Monitor {monitorId}</span>
          </h1>
          <p>
            {currentUserName} ·{" "}
            <span role="status">{message || "Abrindo documentos..."}</span>
          </p>
        </div>
        <a href="/grupamento" className={tool}>
          Voltar ao painel
        </a>
      </header>
      <nav className="mcl-editor-toolbar" aria-label="Ferramentas de edição">
        <button
          className={tool}
          disabled={!dirtyIds.size || busy}
          title="Salvar rascunho (Ctrl+S)"
          onClick={() => void save()}
        >
          <Save size={16} />
          Salvar rascunho
        </button>
        <button
          className={`${tool} primary`}
          disabled={
            !unpublished.size ||
            busy ||
            issues.some((i) => i.severity === "error")
          }
          onClick={() => void publish()}
        >
          <Send size={16} />
          Publicar alterações
        </button>
        <span className="mcl-tool-divider" />
        <button
          className={tool}
          aria-label="Desfazer"
          title="Desfazer (Ctrl+Z)"
          disabled={!history.length || busy}
          onClick={() => undoEdit()}
        >
          <Undo2 size={17} />
        </button>
        <button
          className={tool}
          aria-label="Refazer"
          title="Refazer (Ctrl+Shift+Z)"
          disabled={!future.length || busy}
          onClick={() => undoEdit(true)}
        >
          <Redo2 size={17} />
        </button>
        <button
          className={tool}
          disabled={!scene || busy}
          onClick={() =>
            add({
              ...base,
              kind: "text",
              text: "Escreva aqui",
              fontFace: "Inter",
              fontSizePt: 24,
              color: "#111827",
              role: "body",
            })
          }
        >
          <Type size={17} />
          Texto
        </button>
        <button
          className={tool}
          disabled={!scene || busy}
          onClick={() => imageInput.current?.click()}
        >
          <ImagePlus size={17} />
          Imagem
        </button>
        <input
          ref={imageInput}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void uploadImage(e.target.files?.[0])}
        />
        <button
          className={tool}
          disabled={!scene || busy}
          onClick={() =>
            add({ ...base, kind: "shape", fill: "#dbe7e3", radius: 0.02 })
          }
        >
          <Square size={17} />
          Forma
        </button>
        <details className="mcl-tool-menu">
          <summary className={tool}>Organizar</summary>
          <div>
            <button
              onClick={() => {
                setProposal(optimizeEditorElements(elements, true));
                select([]);
              }}
            >
              Organizar automaticamente...
            </button>
            <label>
              Layout MCL
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value)
                    setProposal(
                      proposeEditorLayout(
                        elements,
                        e.target.value as (typeof EDITOR_LAYOUTS)[number],
                      ),
                    );
                  e.target.value = "";
                }}
              >
                <option value="">Escolher proposta...</option>
                {EDITOR_LAYOUTS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Referência{" "}
              <select
                value={alignment}
                onChange={(e) =>
                  setAlignment(e.target.value as typeof alignment)
                }
              >
                <option value="selection">Seleção</option>
                <option value="slide">Slide</option>
              </select>
            </label>
            {[
              ["left", "À esquerda"],
              ["center", "Centro horizontal"],
              ["right", "À direita"],
              ["top", "Ao topo"],
              ["middle", "Centro vertical"],
              ["bottom", "À base"],
              ["distribute-x", "Distribuir horizontalmente"],
              ["distribute-y", "Distribuir verticalmente"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                disabled={!chosen.length}
                onClick={() => align(mode)}
              >
                {label}
              </button>
            ))}
            <button disabled={chosen.length < 2} onClick={() => group()}>
              Agrupar
            </button>
            <button
              disabled={!chosen.some((e) => e.groupId)}
              onClick={() => group(true)}
            >
              Desagrupar
            </button>
            {[
              ["front", "Trazer para frente"],
              ["up", "Avançar uma camada"],
              ["down", "Recuar uma camada"],
              ["back", "Enviar para trás"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                disabled={!chosen.length}
                onClick={() => zOrder(mode as "front")}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
        <details className="mcl-tool-menu">
          <summary className={tool}>Exibir</summary>
          <div>
            {[
              ["Grade", grid, setGrid],
              ["Snap", snap, setSnap],
              ["Área segura", safe, setSafe],
              ["Camadas", showLayers, setShowLayers],
              ["Versões", showVersions, setShowVersions],
            ].map(([label, value, set]) => (
              <label key={String(label)}>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) =>
                    (set as (value: boolean) => void)(e.target.checked)
                  }
                />
                {String(label)}
              </label>
            ))}
            <button onClick={() => showImports((v) => !v)}>
              Adicionar arquivo
            </button>
          </div>
        </details>
        <button
          className={tool}
          disabled={!scene}
          onClick={() => {
            setPreview((v) => !v);
            select([]);
            setInline(null);
          }}
        >
          <Eye size={17} />
          {preview ? "Voltar à edição" : "Visualizar"}
        </button>
      </nav>
      {error && (
        <div role="alert" className="mcl-editor-error">
          {error}{" "}
          <button
            onClick={() => {
              if (
                !dirtyRef.current.size ||
                window.confirm(
                  "Recarregar descarta apenas as mudanças locais ainda não salvas. Continuar?",
                )
              )
                void load();
            }}
          >
            Recarregar
          </button>
        </div>
      )}
      {localRecovery && (
        <div className="mcl-editor-status">
          Há um rascunho local não sincronizado.{" "}
          <button
            onClick={() => {
              for (const d of localRecovery) {
                const s = scenesRef.current.find((s) => s.id === d.sceneId);
                if (
                  s &&
                  editorRevision(s) === d.baseRevision &&
                  (revisions.current.get(s.id) ?? 0) === d.revision
                ) {
                  record(s.id, content(s), d.content);
                  setAll(
                    scenesRef.current.map((v) =>
                      v.id === s.id ? withContent(v, d.content) : v,
                    ),
                  );
                } else
                  setError(
                    "O rascunho local pertence a outra revisão. Ele foi preservado neste navegador e não foi aplicado.",
                  );
              }
              setLocalRecovery(null);
            }}
          >
            Recuperar alterações
          </button>
        </div>
      )}
      {proposal && (
        <div className="mcl-editor-status">
          Prévia da organização automática{" "}
          <button
            onClick={() => {
              changeElements(proposal);
              setProposal(null);
            }}
          >
            Aplicar
          </button>{" "}
          <button onClick={() => setProposal(null)}>Cancelar</button>
        </div>
      )}
      {imports && (
        <section className="mcl-editor-imports">
          <MonitorContentCockpit
            monitorId={monitorId}
            expanded
            currentUserName={currentUserName}
          />
          <button
            className={tool}
            onClick={() => {
              if (!dirtyRef.current.size) {
                void load();
                showImports(false);
              } else setError("Salve o rascunho antes de atualizar a lista.");
            }}
          >
            Atualizar documentos
          </button>
        </section>
      )}
      <div className="mcl-editor-workspace">
        <aside className="mcl-editor-slides" aria-label="Telas documentais">
          {scenes.map((s) => (
            <Thumbnail
              key={s.id}
              scene={s}
              selected={s.id === slideId}
              changed={unpublished.has(s.id)}
              onSelect={selectSlide}
            />
          ))}
        </aside>
        <section className="mcl-editor-center">
          {loading ? (
            <p>Carregando documentos...</p>
          ) : !visibleScene ? (
            <div className="mcl-editor-empty">
              <h2>Abra um documento para começar</h2>
              <button className={tool} onClick={() => showImports(true)}>
                Adicionar arquivo
              </button>
            </div>
          ) : (
            <div
              ref={scroll}
              className="mcl-editor-scroll"
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  setZoom((v) =>
                    Math.min(300, Math.max(25, v + (e.deltaY < 0 ? 10 : -10))),
                  );
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith("image/")) {
                  const overlay = e.currentTarget
                    .querySelector(".mcl-editor-overlay")
                    ?.getBoundingClientRect();
                  void uploadImage(
                    file,
                    overlay
                      ? {
                          x: (e.clientX - overlay.x) / overlay.width,
                          y: (e.clientY - overlay.y) / overlay.height,
                        }
                      : undefined,
                  );
                } else showImports(true);
              }}
            >
              <div className="mcl-editor-canvas" style={{ width: `${zoom}%` }}>
                <MonitorTitleFrame
                  title={visibleScene.title}
                  preserveTitle
                  light
                  omitTitle={monitorIntegralImage(visibleScene.payload)}
                >
                  <MonitorDocumentLayout
                    scene={visibleScene}
                    ccol
                    briefing
                    paused
                    overlay={
                      !preview && (
                        <div
                          className={`mcl-editor-overlay ${grid ? "show-grid" : ""}`}
                          onPointerDown={(e) => marqueeEvent(e, "start")}
                          onPointerMove={(e) => marqueeEvent(e, "move")}
                          onPointerUp={(e) => marqueeEvent(e, "end")}
                        >
                          {safe && <div className="mcl-editor-safe" />}
                          {visibleScene.payload
                            .layout!.elements.filter(
                              (e) => !hidden.has(e.elementId!),
                            )
                            .map((e, index) => (
                              <div
                                key={e.elementId}
                                data-element-id={e.elementId}
                                role="button"
                                tabIndex={0}
                                aria-label={`Selecionar ${labels[e.kind]} ${index + 1}`}
                                className={`mcl-editor-object ${selected.includes(e.elementId!) ? "selected" : ""} ${e.locked ? "locked" : ""}`}
                                style={{
                                  left: `${e.x * 100}%`,
                                  top: `${e.y * 100}%`,
                                  width: `${e.w * 100}%`,
                                  height: `${e.h * 100}%`,
                                  zIndex: e.z + 1,
                                  transform: e.rotation
                                    ? `rotate(${e.rotation}deg)`
                                    : undefined,
                                }}
                                onPointerDown={(event) => startMove(event, e)}
                                onPointerMove={move}
                                onPointerUp={() => finishMove()}
                                onPointerCancel={() => finishMove(true)}
                                onDoubleClick={() => {
                                  if (e.kind === "text" && !e.locked) {
                                    select([e.elementId!]);
                                    setInline(e.elementId!);
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    select(idsFor(e));
                                    event.preventDefault();
                                  }
                                }}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  select(idsFor(e));
                                  setContext({
                                    x: event.clientX,
                                    y: event.clientY,
                                  });
                                }}
                              >
                                {inline === e.elementId &&
                                  e.kind === "text" && (
                                    <textarea
                                      autoFocus
                                      aria-label="Editar texto no canvas"
                                      className="mcl-editor-inline"
                                      value={e.text}
                                      style={{
                                        fontSize: `${((e.fontSizePt ?? 18) / (scene!.payload.layout!.width / 12700)) * 100}cqw`,
                                        fontWeight: e.bold ? 700 : 400,
                                        textAlign: e.align,
                                      }}
                                      onPointerDown={(event) =>
                                        event.stopPropagation()
                                      }
                                      onChange={(event) =>
                                        changeElements(
                                          elements.map((v) =>
                                            v.elementId === e.elementId
                                              ? {
                                                  ...e,
                                                  text: event.target.value,
                                                }
                                              : v,
                                          ),
                                          `text:${e.elementId}`,
                                        )
                                      }
                                      onBlur={() => setInline(null)}
                                      onKeyDown={(event) => {
                                        if (
                                          event.key === "Escape" ||
                                          (event.key === "Enter" &&
                                            (event.ctrlKey || event.metaKey))
                                        )
                                          setInline(null);
                                      }}
                                    />
                                  )}
                              </div>
                            ))}
                          {bounds && !inline && !proposal && (
                            <div
                              className="mcl-editor-selection"
                              style={{
                                left: `${bounds.x * 100}%`,
                                top: `${bounds.y * 100}%`,
                                width: `${bounds.w * 100}%`,
                                height: `${bounds.h * 100}%`,
                              }}
                            >
                              {RESIZE_HANDLES.map((h) => (
                                <span
                                  key={h}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Redimensionar ${h}`}
                                  className={`mcl-editor-handle handle-${h}`}
                                  onPointerDown={(e) =>
                                    startMove(e, undefined, h)
                                  }
                                  onPointerMove={move}
                                  onPointerUp={() => finishMove()}
                                  onPointerCancel={() => finishMove(true)}
                                />
                              ))}
                              {chosen.every(
                                (e) =>
                                  e.kind === "text" ||
                                  e.kind === "image" ||
                                  e.kind === "shape",
                              ) && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  aria-label="Girar seleção"
                                  className="mcl-editor-rotate"
                                  onPointerDown={(e) =>
                                    startMove(e, undefined, undefined, true)
                                  }
                                  onPointerMove={move}
                                  onPointerUp={() => finishMove()}
                                  onPointerCancel={() => finishMove(true)}
                                />
                              )}
                            </div>
                          )}
                          {guides.map((g, i) => (
                            <div
                              key={i}
                              className={`mcl-editor-guide guide-${g.axis}`}
                              style={
                                g.axis === "x"
                                  ? { left: `${g.value * 100}%` }
                                  : { top: `${g.value * 100}%` }
                              }
                            />
                          ))}
                          {marquee && (
                            <div
                              className="mcl-editor-marquee"
                              style={{
                                left: `${marquee.x * 100}%`,
                                top: `${marquee.y * 100}%`,
                                width: `${marquee.w * 100}%`,
                                height: `${marquee.h * 100}%`,
                              }}
                            />
                          )}
                        </div>
                      )
                    }
                  />
                </MonitorTitleFrame>
              </div>
            </div>
          )}
          <footer className="mcl-editor-footer">
            <span>
              {selected.length
                ? `${selected.length} objeto(s)`
                : "Duplo clique edita texto · Shift seleciona vários · Alt desativa snap"}
            </span>
            <div>
              <button
                className={tool}
                aria-label="Reduzir zoom"
                onClick={() => setZoom((v) => Math.max(25, v - 10))}
              >
                <ZoomOut size={15} />
              </button>
              <span>{zoom}%</span>
              <button
                className={tool}
                aria-label="Ampliar zoom"
                onClick={() => setZoom((v) => Math.min(300, v + 10))}
              >
                <ZoomIn size={15} />
              </button>
              <button className={tool} onClick={() => setZoom(100)}>
                Ajustar à largura
              </button>
            </div>
          </footer>
        </section>
        <aside className="mcl-editor-properties">
          <h2>
            {chosen.length > 1
              ? `${chosen.length} objetos`
              : item
                ? labels[item.kind]
                : "Slide"}
          </h2>
          {scene && (
            <label>
              Nome da tela
              <input
                aria-label="Nome da tela"
                value={scene.title}
                maxLength={240}
                onChange={(e) =>
                  update({ title: e.target.value, elements }, "title")
                }
              />
              <button
                className="mcl-editor-link"
                onClick={() => {
                  const title = normalizeMonitorTitle(scene.title);
                  if (
                    title !== scene.title &&
                    window.confirm(`Aplicar título: ${title}?`)
                  )
                    update({ title, elements });
                }}
              >
                Revisar capitalização
              </button>
            </label>
          )}
          {chosen.length > 0 && (
            <>
              <div className="mcl-editor-quick">
                <button
                  className={tool}
                  title="Duplicar (Ctrl+D)"
                  onClick={() => paste(true)}
                >
                  <Copy size={15} />
                </button>
                <button
                  className={tool}
                  title="Excluir (Delete)"
                  onClick={deleteSelected}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <details open>
                <summary>Posição e tamanho</summary>
                <div className="mcl-editor-dimensions">
                  {item &&
                    (["x", "y", "w", "h"] as const).map((key) => (
                      <label key={key}>
                        {
                          {
                            x: "Esquerda",
                            y: "Topo",
                            w: "Largura",
                            h: "Altura",
                          }[key]
                        }{" "}
                        %
                        <input
                          type="number"
                          step=".1"
                          value={Math.round(item[key] * 10000) / 100}
                          onChange={(e) => {
                            const n = Number(e.target.value) / 100;
                            if (
                              Number.isFinite(n) &&
                              (key === "x" || key === "y" || n > 0)
                            )
                              patchSelected({ [key]: n }, `number:${key}`);
                          }}
                        />
                      </label>
                    ))}
                </div>
                {item && ["text", "image", "shape"].includes(item.kind) && (
                  <label>
                    Rotação °
                    <input
                      type="number"
                      min="-360"
                      max="360"
                      value={Math.round(item.rotation ?? 0)}
                      onChange={(e) =>
                        patchSelected(
                          { rotation: Number(e.target.value) },
                          "rotation",
                        )
                      }
                    />
                  </label>
                )}
              </details>
            </>
          )}
          {item?.kind === "text" && (
            <details open>
              <summary>Texto</summary>
              <label>
                Texto do objeto
                <textarea
                  value={item.text}
                  onChange={(e) =>
                    patchSelected(
                      { text: e.target.value },
                      `text:${item.elementId}`,
                    )
                  }
                />
              </label>
              <label>
                Fonte
                <select
                  value={item.fontFace ?? "Inter"}
                  onChange={(e) => patchSelected({ fontFace: e.target.value })}
                >
                  {["Inter", "Segoe UI", "Arial"].map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label>
                Tamanho
                <input
                  type="number"
                  min="10"
                  max="72"
                  value={item.fontSizePt ?? 18}
                  onChange={(e) =>
                    patchSelected(
                      {
                        fontSizePt: Math.max(
                          10,
                          Math.min(72, Number(e.target.value)),
                        ),
                      },
                      "font-size",
                    )
                  }
                />
              </label>
              <div className="mcl-editor-quick">
                <button
                  className={tool}
                  aria-pressed={!!item.bold}
                  onClick={() => patchSelected({ bold: !item.bold })}
                >
                  <b>N</b>
                </button>
                <button
                  className={tool}
                  aria-pressed={!!item.italic}
                  onClick={() => patchSelected({ italic: !item.italic })}
                >
                  <i>I</i>
                </button>
                <button
                  className={tool}
                  aria-pressed={!!item.underline}
                  onClick={() => patchSelected({ underline: !item.underline })}
                >
                  <u>S</u>
                </button>
              </div>
              <label>
                Cor do texto
                <input
                  type="color"
                  value={item.color ?? "#111827"}
                  onChange={(e) =>
                    patchSelected({ color: e.target.value }, "text-color")
                  }
                />
              </label>
              <label>
                Alinhamento
                <select
                  value={item.align ?? "left"}
                  onChange={(e) =>
                    patchSelected({ align: e.target.value as "left" })
                  }
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </label>
              <label>
                Vertical
                <select
                  value={item.verticalAlign ?? "top"}
                  onChange={(e) =>
                    patchSelected({ verticalAlign: e.target.value as "top" })
                  }
                >
                  <option value="top">Topo</option>
                  <option value="middle">Meio</option>
                  <option value="bottom">Base</option>
                </select>
              </label>
            </details>
          )}
          {item?.kind === "shape" && (
            <details open>
              <summary>Aparência</summary>
              <label>
                Tipo de forma
                <select
                  aria-label="Tipo de forma"
                  value={item.shapeType ?? "rect"}
                  onChange={(e) =>
                    patchSelected({ shapeType: e.target.value as "rect" })
                  }
                >
                  {[
                    ["rect", "Retângulo"],
                    ["roundRect", "Retângulo arredondado"],
                    ["ellipse", "Elipse"],
                    ["line", "Linha"],
                    ["arrow", "Seta"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Espessura do contorno
                <input
                  type="number"
                  min=".1"
                  max="20"
                  step=".1"
                  value={item.lineWidth ?? 1}
                  onChange={(e) =>
                    patchSelected(
                      { lineWidth: Number(e.target.value) },
                      "line-width",
                    )
                  }
                />
              </label>
              <label>
                Preenchimento
                <input
                  type="color"
                  value={item.fill ?? "#dbe7e3"}
                  onChange={(e) =>
                    patchSelected({ fill: e.target.value }, "fill")
                  }
                />
              </label>
              <label>
                Contorno
                <input
                  type="color"
                  value={item.lineColor ?? "#dbe7e3"}
                  onChange={(e) =>
                    patchSelected({ lineColor: e.target.value }, "stroke")
                  }
                />
              </label>
              <label>
                Cantos arredondados
                <input
                  type="range"
                  min="0"
                  max=".5"
                  step=".01"
                  value={item.radius ?? 0}
                  onChange={(e) =>
                    patchSelected({ radius: Number(e.target.value) }, "radius")
                  }
                />
              </label>
            </details>
          )}
          {item?.kind === "image" && (
            <details open>
              <summary>Imagem</summary>
              <button
                className={tool}
                onClick={() => {
                  replaceImage.current = true;
                  imageInput.current?.click();
                }}
              >
                Substituir imagem
              </button>
              <label>
                Enquadramento
                <select
                  aria-label="Enquadramento"
                  value={item.fit ?? "contain"}
                  onChange={(e) =>
                    patchSelected({ fit: e.target.value as "contain" })
                  }
                >
                  <option value="contain">Imagem inteira (contain)</option>
                  <option value="cover">Preencher e cortar (cover)</option>
                </select>
              </label>
            </details>
          )}
          {(item?.kind === "image" || item?.kind === "shape") && (
            <label>
              Opacidade
              <input
                type="range"
                min="0"
                max="1"
                step=".01"
                value={item.opacity ?? 1}
                onChange={(e) =>
                  patchSelected({ opacity: Number(e.target.value) }, "opacity")
                }
              />
            </label>
          )}
          {item?.kind === "chart" && (
            <details open>
              <summary>Gráfico</summary>
              <p>Valores protegidos. A formatação mantém os dados da fonte.</p>
              <label>
                Título do gráfico
                <input
                  value={item.chart.title ?? ""}
                  onChange={(e) =>
                    patchSelected(
                      { chart: { ...item.chart, title: e.target.value } },
                      "chart-title",
                    )
                  }
                />
              </label>
              <label>
                Legenda
                <select
                  aria-label="Legenda"
                  value={item.chart.legendPosition ?? "bottom"}
                  onChange={(e) =>
                    patchSelected({
                      chart: {
                        ...item.chart,
                        legendPosition: e.target.value as "bottom",
                      },
                    })
                  }
                >
                  {[
                    ["top", "Topo"],
                    ["bottom", "Base"],
                    ["left", "Esquerda"],
                    ["right", "Direita"],
                    ["none", "Ocultar"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.chart.showGridlines ?? true}
                  onChange={(e) =>
                    patchSelected({
                      chart: { ...item.chart, showGridlines: e.target.checked },
                    })
                  }
                />
                Linhas de grade
              </label>
              {item.chart.series.map((s, i) => (
                <div key={i}>
                  <label>
                    {s.name || `Série ${i + 1}`}
                    <input
                      type="color"
                      value={s.color ?? "#0284c7"}
                      onChange={(e) =>
                        patchSelected(
                          {
                            chart: {
                              ...item.chart,
                              series: item.chart.series.map((v, j) =>
                                j === i
                                  ? {
                                      ...v,
                                      color: e.target.value,
                                      pointColors: undefined,
                                    }
                                  : v,
                              ),
                            },
                          },
                          `chart:${i}`,
                        )
                      }
                    />
                  </label>
                  {s.categories.map((name, j) => (
                    <label key={j}>
                      {name}
                      <input
                        type="color"
                        value={s.pointColors?.[j] ?? s.color ?? "#0284c7"}
                        onChange={(e) =>
                          patchSelected(
                            {
                              chart: {
                                ...item.chart,
                                series: item.chart.series.map((v, k) =>
                                  k === i
                                    ? {
                                        ...v,
                                        pointColors: v.categories.map((_, n) =>
                                          n === j
                                            ? e.target.value
                                            : (v.pointColors?.[n] ??
                                              v.color ??
                                              "#0284c7"),
                                        ),
                                      }
                                    : v,
                                ),
                              },
                            },
                            `point:${i}:${j}`,
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              ))}
            </details>
          )}
          {item?.kind === "table" && (
            <details open>
              <summary>Tabela</summary>
              <div className="mcl-editor-table">
                <table>
                  <thead>
                    <tr>
                      {item.columns.map((v, i) => (
                        <th key={i}>
                          <input
                            aria-label={`Cabeçalho ${i + 1}`}
                            value={v}
                            onChange={(e) =>
                              patchSelected(
                                {
                                  columns: item.columns.map((c, j) =>
                                    j === i ? e.target.value : c,
                                  ),
                                },
                                `header:${i}`,
                              )
                            }
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.rows
                      .slice(tablePage * 10, tablePage * 10 + 10)
                      .map((row, i) => (
                        <tr key={i}>
                          {row.map((v, j) => (
                            <td key={j}>
                              <input
                                aria-label={`Linha ${tablePage * 10 + i + 1}, coluna ${j + 1}`}
                                value={v}
                                onChange={(e) =>
                                  patchSelected(
                                    {
                                      rows: item.rows.map((r, k) =>
                                        k === tablePage * 10 + i
                                          ? r.map((c, n) =>
                                              n === j ? e.target.value : c,
                                            )
                                          : r,
                                      ),
                                    },
                                    `cell:${tablePage * 10 + i}:${j}`,
                                  )
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <button
                className={tool}
                disabled={tablePage === 0}
                onClick={() => setTablePage((v) => v - 1)}
              >
                Anterior
              </button>
              <button
                className={tool}
                disabled={(tablePage + 1) * 10 >= item.rows.length}
                onClick={() => setTablePage((v) => v + 1)}
              >
                Próxima
              </button>
              <button
                className={tool}
                onClick={() =>
                  patchSelected({
                    rows: [...item.rows, item.columns.map(() => "")],
                  })
                }
              >
                Adicionar linha
              </button>
              <button
                className={tool}
                disabled={!item.rows.length}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remover a última linha? Você poderá desfazer.",
                    )
                  )
                    patchSelected({ rows: item.rows.slice(0, -1) });
                }}
              >
                Remover última linha
              </button>
              <button
                className={tool}
                onClick={() =>
                  patchSelected({
                    columns: [...item.columns, "Nova coluna"],
                    rows: item.rows.map((r) => [...r, ""]),
                  })
                }
              >
                Adicionar coluna
              </button>
              <button
                className={tool}
                disabled={item.columns.length < 2}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remover a última coluna? Você poderá desfazer.",
                    )
                  )
                    patchSelected({
                      columns: item.columns.slice(0, -1),
                      rows: item.rows.map((row) => row.slice(0, -1)),
                    });
                }}
              >
                Remover última coluna
              </button>
            </details>
          )}
          <details open={issues.length > 0}>
            <summary>
              {issues.some((i) => i.severity === "error")
                ? "Não publicar"
                : issues.length
                  ? "Revisar"
                  : "Pronto para publicar"}{" "}
              · Preflight
            </summary>
            {issues.map((issue, i) => (
              <button
                className="mcl-editor-issue"
                key={i}
                onClick={() => select([issue.id])}
              >
                {issue.message}
              </button>
            ))}
            {!issues.length && (
              <p>
                Sem falhas estruturais detectadas. Confira a prévia antes de
                publicar.
              </p>
            )}
          </details>
          {showLayers && (
            <details open>
              <summary>
                <Layers size={14} /> Camadas
              </summary>
              {[...elements]
                .sort((a, b) => b.z - a.z)
                .map((e) => (
                  <div
                    key={e.elementId}
                    className={`mcl-editor-layer ${selected.includes(e.elementId!) ? "active" : ""}`}
                  >
                    <button onClick={() => select(idsFor(e))}>
                      {e.name ??
                        (e.kind === "text"
                          ? e.text.slice(0, 28)
                          : labels[e.kind])}
                    </button>
                    <button
                      title={e.locked ? "Desbloquear" : "Bloquear"}
                      onClick={() =>
                        changeElements(
                          elements.map((v) =>
                            v.elementId === e.elementId
                              ? { ...v, locked: !v.locked }
                              : v,
                          ),
                        )
                      }
                    >
                      {e.locked ? "🔒" : "○"}
                    </button>
                    <button
                      title="Ocultar apenas no editor"
                      onClick={() =>
                        setHidden((old) => {
                          const next = new Set(old);
                          if (next.has(e.elementId!)) next.delete(e.elementId!);
                          else next.add(e.elementId!);
                          return next;
                        })
                      }
                    >
                      {hidden.has(e.elementId!) ? "−" : "◉"}
                    </button>
                  </div>
                ))}
            </details>
          )}
          {item && (
            <details>
              <summary>Origem e diagnóstico</summary>
              <p>ID: {item.elementId}</p>
              <p>
                {scene?.sourceFileName} · página {scene?.sourcePage}
              </p>
              <p>
                Confiança:{" "}
                {scene?.payload.inputCompiler?.interpretedContent.confidence ??
                  "não informada"}
              </p>
              {scene?.payload.inputCompiler?.strategy === "NATIVE_FALLBACK" && (
                <p>
                  Bloco visual preservado. Os componentes internos não foram
                  extraídos com segurança.
                </p>
              )}
              {(item.kind === "text" || item.kind === "shape") && (
                <label>
                  Associar ao gráfico
                  <select
                    value={item.attachedTo ?? ""}
                    onChange={(e) =>
                      patchSelected({ attachedTo: e.target.value || undefined })
                    }
                  >
                    <option value="">Sem associação</option>
                    {elements
                      .filter((e) => e.kind === "chart")
                      .map((e) => (
                        <option key={e.elementId} value={e.elementId}>
                          {e.kind === "chart"
                            ? (e.chart.title ?? "Gráfico")
                            : ""}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label>
                Nome do objeto
                <input
                  value={item.name ?? ""}
                  onChange={(e) =>
                    patchSelected({ name: e.target.value }, "name")
                  }
                />
              </label>
            </details>
          )}
          {showVersions && (
            <details open>
              <summary>Revisões anteriores</summary>
              {versions.length ? (
                versions.map((v) => (
                  <p key={v.id}>
                    {new Date(v.createdAt).toLocaleString("pt-BR")} ·{" "}
                    {v.actorId} · {v.kind}
                  </p>
                ))
              ) : (
                <p>Nenhuma revisão anterior registrada.</p>
              )}
            </details>
          )}
        </aside>
      </div>
      {context && (
        <div
          role="menu"
          className="mcl-editor-context"
          style={{
            left: Math.min(context.x, window.innerWidth - 190),
            top: Math.min(context.y, window.innerHeight - 310),
          }}
        >
          {[
            "Copiar",
            "Recortar",
            "Colar",
            "Duplicar",
            "Excluir",
            "Trazer para frente",
            "Enviar para trás",
          ].map((label) => (
            <button
              role="menuitem"
              key={label}
              onClick={() => {
                if (label === "Copiar") copy();
                if (label === "Recortar") copy(true);
                if (label === "Colar") paste();
                if (label === "Duplicar") paste(true);
                if (label === "Excluir") deleteSelected();
                if (label === "Trazer para frente") zOrder("front");
                if (label === "Enviar para trás") zOrder("back");
                setContext(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
