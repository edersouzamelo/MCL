"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Save, Undo2, Redo2, Trash2, Type, ImagePlus, Square, ZoomIn, ZoomOut, LayoutGrid, Upload, Eye, MousePointer2 } from "lucide-react";
import { MonitorDocumentLayout, MonitorDocumentScene } from "./MonitorDocumentScene";
import { MonitorTitleFrame } from "./MonitorTitleFrame";
import { MonitorContentCockpit } from "./MonitorContentCockpit";
import { editorRevision, prepareEditorScene, optimizeEditorElements, type EditorScene } from "@/modules/grupamento/monitor-content/online-editor";
import { normalizeMonitorTitle, monitorIntegralImage } from "@/modules/grupamento/monitor-content/presentation-title";
import type { MonitorSlideElement } from "@/modules/grupamento/monitor-content/types";
import "./monitor-online-editor.css";

export function MonitorOnlineEditor({ monitorId, currentUserName }: { monitorId: number; currentUserName: string }) {
  const [scenes, setScenes] = useState<EditorScene[]>([]), [baseline, setBaseline] = useState<EditorScene[]>([]);
  const [slide, setSlide] = useState(0), [selected, select] = useState<number | null>(null);
  const [undo, setUndo] = useState<EditorScene[][]>([]), [redo, setRedo] = useState<EditorScene[][]>([]);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [tablePage, setTablePage] = useState(0);
  const [zoom, setZoom] = useState(100), [preview, setPreview] = useState(false), [imports, showImports] = useState(false);
  const scene = scenes[slide], elements = scene?.payload.layout?.elements ?? [], item = selected === null ? null : elements[selected];
  const dirty = JSON.stringify(scenes) !== JSON.stringify(baseline);
  const imageInput = useRef<HTMLInputElement>(null);
  const movement = useRef<{ index: number; x: number; y: number; width: number; height: number; box: MonitorSlideElement; resize: boolean } | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/grupamento/monitors/${monitorId}/editor`, { cache: "no-store" });
      const result = await response.json();
      setError("");
      if (!response.ok) throw new Error(result.error ?? "Não foi possível abrir os documentos.");
      const prepared = (result.scenes as EditorScene[]).map(prepareEditorScene);
      setScenes(prepared); setBaseline(structuredClone(prepared)); setUndo([]); setRedo([]); setSlide(0); select(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar."); }
    finally { setLoading(false); }
  }, [monitorId]);
  // Initial fetch synchronizes the editor with external documentary state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function remember() { setUndo(previous => [...previous.slice(-29), structuredClone(scenes)]); setRedo([]); setMessage(""); }
  function replaceElements(next: MonitorSlideElement[], history = true) {
    if (!scene || busy) return;
    if (history) remember();
    setScenes(previous => previous.map((value, i) => i === slide ? { ...value, payload: { ...value.payload, layout: { ...value.payload.layout!, elements: next } } } : value));
  }
  function changeItem(patch: Partial<MonitorSlideElement>) {
    if (selected === null) return;
    replaceElements(elements.map((value, i) => i === selected ? { ...value, ...patch } as MonitorSlideElement : value));
  }
  function add(value: MonitorSlideElement) { replaceElements([...elements, value]); select(elements.length); }
  function undoEdit() { const previous = undo.at(-1); if (!previous || busy) return; setRedo(value => [...value, scenes]); setScenes(previous); setUndo(value => value.slice(0, -1)); select(null); }
  function redoEdit() { const next = redo.at(-1); if (!next || busy) return; setUndo(value => [...value, scenes]); setScenes(next); setRedo(value => value.slice(0, -1)); select(null); }
  function deleteItem() { if (selected !== null) { replaceElements(elements.filter((_, i) => i !== selected)); select(null); } }
  function startMove(event: PointerEvent<HTMLDivElement>, index: number, resize: boolean) {
    if (busy || preview) return;
    event.preventDefault(); event.stopPropagation();
    const bounds = event.currentTarget.parentElement!.getBoundingClientRect();
    select(index); setTablePage(0); remember();
    movement.current = { index, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, box: structuredClone(elements[index]), resize };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = movement.current; if (!start) return;
    const dx = (event.clientX - start.x) / start.width, dy = (event.clientY - start.y) / start.height;
    const clamp = (n: number, max: number) => Math.max(.02, Math.min(max, n));
    const patch = start.resize ? { w: clamp(start.box.w + dx, .98 - start.box.x), h: clamp(start.box.h + dy, .98 - start.box.y) } : { x: clamp(start.box.x + dx, .98 - start.box.w), y: clamp(start.box.y + dy, .98 - start.box.h) };
    replaceElements(elements.map((value, i) => i === start.index ? { ...value, ...patch } : value), false);
  }
  async function save() {
    if (!dirty || busy) return;
    setBusy(true); setError(""); setMessage("Salvando e ajustando a apresentação...");
    try {
      const changed = scenes.filter(value => JSON.stringify(value) !== JSON.stringify(baseline.find(original => original.id === value.id)));
      const response = await fetch(`/api/grupamento/monitors/${monitorId}/editor`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenes: changed.map(value => ({ id: value.id, revision: editorRevision(value), title: value.title, elements: value.payload.layout?.elements ?? [] })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Falha ao salvar.");
      const prepared = (result.scenes as EditorScene[]).map(prepareEditorScene);
      setScenes(prepared); setBaseline(structuredClone(prepared));
      setUndo(history => history.map(snapshot => snapshot.map(value => ({ ...value, payload: { ...value.payload, onlineEditor: prepared.find(current => current.id === value.id)?.payload.onlineEditor ?? value.payload.onlineEditor } }))));
      setRedo([]); select(null);
      window.dispatchEvent(new CustomEvent("mcl-grupamento-document-content-updated"));
      try { localStorage.setItem("mcl-document-content-change", JSON.stringify({ monitorId, at: Date.now() })); } catch { /* Publication succeeds even when local storage is unavailable. */ }
      setMessage("Salvo. As alterações já compõem a apresentação e as próximas exportações.");
    } catch (cause) { setMessage(""); setError(cause instanceof Error ? cause.message : "Falha ao salvar."); }
    finally { setBusy(false); }
  }
  async function uploadImage(file: File | undefined) {
    if (!file || !scene) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("sceneId", scene.id);
      const response = await fetch(`/api/grupamento/monitors/${monitorId}/editor/images`, { method: "POST", body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      remember();
      const imageElement: MonitorSlideElement = { kind: "image", assetId: result.assetId, x: .1, y: .1, w: .5, h: .5, z: Math.min(1000, Math.max(0, ...elements.map(value => value.z)) + 1) };
      setScenes(previous => previous.map((value, i) => i === slide ? { ...value, payload: { ...value.payload, layout: { ...value.payload.layout!, elements: [...elements, imageElement] } } } : value)); select(elements.length); setPreview(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao adicionar imagem."); }
    finally { setBusy(false); if (imageInput.current) imageInput.current.value = ""; }
  }
  const base = { x: .1, y: .1, w: .4, h: .2, z: Math.min(1000, Math.max(0, ...elements.map(value => value.z)) + 1) };
  const button = "mcl-editor-tool";
  return <main className="mcl-online-editor">
    <header className="mcl-editor-header"><div><h1>Editar conteúdo online · Monitor {monitorId}</h1><p>Conteúdos documentais · {currentUserName} · {dirty ? "Alterações não salvas" : "Sem alterações pendentes"}</p></div><a href="/grupamento" className={button}>Voltar ao painel</a></header>
    <nav className="mcl-editor-toolbar" aria-label="Ferramentas de edição">
      <button className={`${button} primary`} disabled={!dirty || busy} onClick={() => void save()}><Save size={18} />{busy ? "Aguarde..." : "Salvar"}</button>
      <button className={button} disabled={!undo.length || busy} onClick={undoEdit} title="Desfazer a última alteração"><Undo2 size={18} />Desfazer</button>
      <button className={button} disabled={!redo.length || busy} onClick={redoEdit}><Redo2 size={18} />Refazer</button>
      <button className={button} disabled={!scene || busy} onClick={() => { add({ ...base, kind: "text", text: "Escreva aqui", fontFace: "Arial", fontSizePt: 24, color: "#111827", role: "body" }); setPreview(false); }}><Type size={18} />Texto</button>
      <button className={button} disabled={!scene || busy} onClick={() => imageInput.current?.click()}><ImagePlus size={18} />Adicionar imagem</button>
      <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => void uploadImage(event.target.files?.[0])} />
      <button className={button} disabled={!scene || busy} onClick={() => { add({ ...base, kind: "shape", fill: "#e2e8f0", radius: .02 }); setPreview(false); }}><Square size={18} />Forma</button>
      <button className={button} disabled={!item || busy} onClick={deleteItem}><Trash2 size={18} />Apagar objeto</button>
      <button className={button} disabled={!scene || busy} onClick={() => replaceElements(optimizeEditorElements(elements, true))} title="Distribui os objetos na área útil da tela"><LayoutGrid size={18} />Organizar</button>
      <button className={button} disabled={busy} onClick={() => showImports(value => !value)}><Upload size={18} />Adicionar arquivo</button>
      <button className={button} disabled={!scene} onClick={() => { setPreview(value => !value); select(null); }}>{preview ? <MousePointer2 size={18} /> : <Eye size={18} />}{preview ? "Editar" : "Visualizar"}</button>
      <button className={button} aria-label="Reduzir visualização" onClick={() => setZoom(value => Math.max(50, value - 10))}><ZoomOut size={18} /></button><span>{zoom}%</span><button className={button} aria-label="Ampliar visualização" onClick={() => setZoom(value => Math.min(180, value + 10))}><ZoomIn size={18} /></button>
    </nav>
    {message && <p role="status" className="mcl-editor-status">{message}</p>}{error && <p role="alert" className="mcl-editor-error">{error} <button onClick={() => { if (!dirty || window.confirm("Recarregar descarta as alterações não salvas. Continuar?")) void load(); }}>Recarregar documentos</button></p>}
    {imports && <section className="mcl-editor-imports"><h2>Adicionar conteúdo documental</h2><p>Importe, revise e aprove o novo arquivo. Depois atualize a lista de telas.</p><MonitorContentCockpit monitorId={monitorId} expanded currentUserName={currentUserName} /><button className={button} disabled={busy} onClick={() => { if (!dirty || window.confirm("Salve suas edições antes de atualizar. Descartar as alterações pendentes?")) { void load(); showImports(false); } }}>Atualizar lista de telas</button></section>}
    <div className="mcl-editor-workspace">
      <aside className="mcl-editor-slides" aria-label="Telas documentais">{scenes.map((value, index) => <button key={value.id} className={index === slide ? "selected" : ""} disabled={busy} onClick={() => { setSlide(index); select(null); }}><span>{index + 1}. {normalizeMonitorTitle(value.title)}</span><div className="mcl-editor-thumbnail"><MonitorDocumentScene scene={value} ccol briefing paused /></div></button>)}</aside>
      <section className="mcl-editor-center"><p className="mcl-editor-hint">{preview ? "Prévia da apresentação" : "Clique para selecionar. Arraste para mover. Use o canto azul para redimensionar."}</p>
        {loading ? <p>Carregando documentos...</p> : !scene ? <div className="mcl-editor-empty"><h2>Nenhum conteúdo documental publicado</h2><p>Use Adicionar arquivo para importar, revisar e aprovar um documento.</p></div> : <div className="mcl-editor-scroll"><div className="mcl-editor-canvas" style={{ width: `${zoom}%` }}>
          <MonitorTitleFrame title={scene.title} light omitTitle={monitorIntegralImage(scene.payload)}><MonitorDocumentLayout scene={scene} ccol briefing paused overlay={!preview && <div className="mcl-editor-overlay" onClick={() => select(null)}>{elements.map((value, index) => <div key={index} role="button" tabIndex={0} aria-label={`Selecionar ${value.kind === "text" ? "texto" : value.kind === "image" ? "imagem" : value.kind === "chart" ? "gráfico" : value.kind === "table" ? "tabela" : "forma"} ${index + 1}`} className={`mcl-editor-object ${selected === index ? "selected" : ""}`} style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%`, width: `${value.w * 100}%`, height: `${value.h * 100}%`, zIndex: value.z + 1 }} onClick={event => { event.stopPropagation(); select(index); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(index); } if (event.key === "Delete" && selected === index) deleteItem(); if (event.key.startsWith("Arrow")) { event.preventDefault(); select(index); replaceElements(elements.map((item, i) => i === index ? { ...item, x: Math.max(0, Math.min(1 - item.w, item.x + (event.key === "ArrowRight" ? .005 : event.key === "ArrowLeft" ? -.005 : 0))), y: Math.max(0, Math.min(1 - item.h, item.y + (event.key === "ArrowDown" ? .005 : event.key === "ArrowUp" ? -.005 : 0))) } : item)); } }} onPointerDown={event => startMove(event, index, (event.target as HTMLElement).dataset.resize === "true")} onPointerMove={move} onPointerUp={() => { movement.current = null; }} onPointerCancel={() => { movement.current = null; }}>{selected === index && <span data-resize="true" className="mcl-editor-resize" title="Arraste para redimensionar" />}</div>)}</div>} /></MonitorTitleFrame>
        </div></div>}
      </section>
      <aside className="mcl-editor-properties"><h2>Propriedades</h2>{scene && <><label>Nome da tela<input maxLength={240} value={scene.title} disabled={busy} onChange={event => { remember(); setScenes(previous => previous.map((value, i) => i === slide ? { ...value, title: event.target.value } : value)); }} onBlur={() => { if (scene.title !== normalizeMonitorTitle(scene.title)) setScenes(previous => previous.map((value, i) => i === slide ? { ...value, title: normalizeMonitorTitle(value.title) } : value)); }} /></label><p>O MCL mantém tamanho, cor e padrão de escrita do título.</p></>}
        {!item ? <p>Selecione um objeto para editar. Imagens de documentos digitalizados podem ser movidas e redimensionadas; seu texto interno faz parte da imagem.</p> : <fieldset disabled={busy}><legend>Objeto selecionado</legend>
          {item.kind === "text" && <><label>Texto<textarea aria-label="Texto do objeto" value={item.text} onChange={event => changeItem({ text: event.target.value })} /></label><label>Tamanho do texto<select value={item.fontSizePt ?? 18} onChange={event => changeItem({ fontSizePt: Number(event.target.value) })}>{[10,12,14,16,18,20,24,28,32,36,44,52,60,72,...(item.fontSizePt ? [item.fontSizePt] : [])].filter((value, i, all) => all.indexOf(value) === i).sort((a,b) => a-b).map(value => <option key={value}>{value}</option>)}</select></label><label>Cor do texto<input type="color" value={item.color ?? "#111827"} onChange={event => changeItem({ color: event.target.value })} /></label><label>Alinhamento<select value={item.align ?? "left"} onChange={event => changeItem({ align: event.target.value as "left" | "center" | "right" })}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><button className={button} onClick={() => changeItem({ bold: !item.bold })}>Negrito {item.bold ? "ativo" : "inativo"}</button></>}
          {item.kind === "shape" && <label>Preenchimento<input type="color" value={item.fill ?? "#e2e8f0"} onChange={event => changeItem({ fill: event.target.value })} /></label>}
          {item.kind === "chart" && <><p>Altere as cores. Os valores do documento permanecem preservados.</p>{item.chart.series.map((series, index) => <div key={index}><label>{series.name || `Série ${index + 1}`}<input type="color" value={series.color ?? "#0284c7"} onChange={event => changeItem({ chart: { ...item.chart, series: item.chart.series.map((value, i) => i === index ? { ...value, color: event.target.value, pointColors: undefined } : value) } })} /></label>{series.categories.map((category, point) => <label key={point}>{category}<input type="color" value={series.pointColors?.[point] ?? series.color ?? "#0284c7"} onChange={event => changeItem({ chart: { ...item.chart, series: item.chart.series.map((value, i) => i === index ? { ...value, pointColors: value.categories.map((_, j) => j === point ? event.target.value : value.pointColors?.[j] ?? value.color ?? "#0284c7") } : value) } })} /></label>)}</div>)}</>}
          {item.kind === "table" && <div className="mcl-editor-table"><p>Clique em uma célula para corrigir seu texto.</p><table><thead><tr>{item.columns.map((cell, column) => <th key={column}><input aria-label={`Cabeçalho ${column + 1}`} value={cell} onChange={event => changeItem({ columns: item.columns.map((value, i) => i === column ? event.target.value : value) })} /></th>)}</tr></thead><tbody>{item.rows.slice(tablePage * 20, tablePage * 20 + 20).map((row, offset) => <tr key={offset}>{row.map((cell, column) => <td key={column}><input aria-label={`Linha ${tablePage * 20 + offset + 1}, coluna ${column + 1}`} value={cell} onChange={event => changeItem({ rows: item.rows.map((value, i) => i === tablePage * 20 + offset ? value.map((text, j) => j === column ? event.target.value : text) : value) })} /></td>)}</tr>)}</tbody></table><button className={button} disabled={tablePage === 0} onClick={() => setTablePage(value => value - 1)}>Linhas anteriores</button><button className={button} disabled={(tablePage + 1) * 20 >= item.rows.length} onClick={() => setTablePage(value => value + 1)}>Próximas linhas</button></div>}
          <div className="mcl-editor-dimensions">{(["x", "y", "w", "h"] as const).map(key => <label key={key}>{({ x: "Esquerda", y: "Topo", w: "Largura", h: "Altura" })[key]} %<input type="number" min={key === "w" || key === "h" ? 4 : 0} max="100" step=".5" value={Math.round(item[key] * 1000) / 10} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value)) changeItem({ [key]: Math.max(key === "w" || key === "h" ? .04 : 0, Math.min(1, value / 100)) }); }} /></label>)}</div>
          <button className={button} onClick={() => changeItem({ z: Math.min(1000, Math.max(0, ...elements.map(value => value.z)) + 1) })}>Trazer para frente</button><button className={button} onClick={() => changeItem({ z: 0 })}>Enviar para trás</button>
        </fieldset>}
      </aside>
    </div>
  </main>;
}
