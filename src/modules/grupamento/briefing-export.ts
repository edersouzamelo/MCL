import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BRIEFING_CONTENT, BRIEFING_SIZE, briefingClass, briefingDate, latestBriefingUpdate } from "./briefing";
import { seriesColor } from "./monitor-content/chart-geometry";
import { fitVerticalCategoryAxis } from "./monitor-content/chart-label-layout";
import { buildCcoClassExecution, CCO_CLASS_SLIDES, findUnmappedPis, type CcoClassId } from "./cco";
import { CCO_SCREEN_CATALOG, CCO_PI_ROWS_PER_PAGE, CCO_UNIT_ROWS_PER_PAGE, type CcoMonitorConfig, type CcoScreenId } from "./monitor";
import type { SagImportResult } from "./sag";
import type { RpnImportResult } from "./rpn";
import type { MonitorDocumentChart, MonitorDocumentSceneDto, MonitorSlideBox } from "./monitor-content/types";
import { prepareMonitorElements } from "./monitor-content/presentation-layout";
import { presentationTextColor } from "./monitor-content/presentation-intelligence";
import { monitorTableSlide } from "./monitor-content/table-layout";

type Slide = PptxGenJS.Slide;
type Box = { x: number; y: number; w: number; h: number };
type Asset = { mimeType: string; data: Uint8Array };
export type BriefingExportInput = {
  monitors: CcoMonitorConfig[];
  sag: SagImportResult | null;
  rpn: RpnImportResult | null;
  scenes: Record<number, MonitorDocumentSceneDto[]>;
  loadAsset: (id: string, monitorId: number) => Promise<Asset | null>;
  frame?: Buffer;
};
const W = BRIEFING_SIZE.width / 914400;
const H = BRIEFING_SIZE.height / 914400;
const CONTENT = { x: W * BRIEFING_CONTENT.x, y: H * BRIEFING_CONTENT.y, w: W * BRIEFING_CONTENT.w, h: H * BRIEFING_CONTENT.h };
const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
const hex = (v?: string, fallback = "FFFFFF") => /^#?[\da-f]{6}$/i.test(v ?? "") ? v!.replace("#", "") : fallback;
const chunks = <T,>(rows: T[], size: number) => Array.from({ length: Math.max(1, Math.ceil(rows.length / size)) }, (_, i) => rows.slice(i * size, (i + 1) * size));
function text(slide: Slide, value: string, box: Box, size = 16, bold = false) {
  slide.addText(value, { ...box, fontFace: "Arial", fontSize: size, bold, color: "172B24", margin: 0, breakLine: false, fit: "shrink", valign: "middle" });
}
function table(slide: Slide, columns: string[], rows: string[][], box: Box) {
  slide.addTable([columns.map((cell) => ({ text: cell, options: { bold: true, color: "FFFFFF", fill: { color: "529377" } } })), ...rows.map((row) => row.map((cell) => ({ text: cell })))], {
    ...box, fontFace: "Arial", fontSize: 12, color: "172B24", fill: { color: "FFFFFF" }, border: { type: "solid", color: "D7E2DD", pt: .5 },
    margin: 4, autoPage: false, rowH: box.h / Math.max(1, rows.length + 1), valign: "middle",
  });
}
function nativeChart(slide: Slide, chart: MonitorDocumentChart, box: Box) {
  if (chart.type === "unknown" || chart.type === "scatter") throw new Error(`Gráfico ${chart.type} requer conversão específica. Exportação interrompida para não alterar seus dados.`);
  if (!chart.series.length) throw new Error("Gráfico sem séries. Verifique o documento publicado.");
  const data = chart.series.map((s) => ({ name: s.name, labels: s.categories, values: s.values.map((v, i) => s.missingValueIndices?.includes(i) ? null : v) }));
  slide.addChart(chart.type, data, {
    ...box, catAxisLabelFontFace: "Arial", catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
    chartColors: chart.type === "pie" || chart.type === "doughnut"
      ? chart.series[0].categories.map((_, i) => hex(chart.series[0].pointColors?.[i] ?? seriesColor({ ...chart.series[0], color: undefined }, i)))
      : chart.series.map((s, i) => hex(seriesColor(s, i))),
    showLegend: chart.legendPosition !== "none" && chart.series.length > 1,
    legendPos: ({ top: "t", bottom: "b", left: "l", right: "r" } as const)[chart.legendPosition === "none" ? "bottom" : chart.legendPosition ?? "bottom"],
    showTitle: Boolean(chart.title), title: chart.title, titleFontFace: "Arial", titleFontSize: 16,
    barDir: chart.orientation === "horizontal" ? "bar" : "col",
    barGrouping: chart.grouping === "stacked" || chart.grouping === "percentStacked" ? chart.grouping : "clustered",
    valAxisMinVal: chart.axisMin, valAxisMaxVal: chart.axisMax, valAxisMajorUnit: chart.majorUnit,
    valAxisLabelFormatCode: chart.valueFormat, catAxisTitle: chart.xAxisTitle, valAxisTitle: chart.yAxisTitle,
    catAxisLabelRotate: chart.orientation === "horizontal" ? 0 : fitVerticalCategoryAxis(chart.series[0].categories, box.w * 96 / Math.max(1, chart.series[0].categories.length), box.h * 96, 14).angle,
    valGridLine: { style: chart.showGridlines === false ? "none" : "solid", color: hex(chart.gridlineColor, "D7E2DD") },
    showCatAxisTitle: Boolean(chart.xAxisTitle), showValAxisTitle: Boolean(chart.yAxisTitle),
    displayBlanksAs: "gap",
    showLabel: chart.type === "pie" || chart.type === "doughnut", showValue: true,
    showPercent: chart.type === "pie" || chart.type === "doughnut", dataLabelFormatCode: chart.valueFormat,
  });
}

export async function buildBriefingPowerPoint(input: BriefingExportInput) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "CCOL_BRIEFING", width: W, height: H });
  pptx.layout = "CCOL_BRIEFING";
  pptx.author = "CCOL / MCL";
  pptx.subject = "Conteúdo publicado dos monitores CCOL";
  pptx.title = "Briefing Logístico atual";
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };
  const frame = input.frame ?? await readFile(path.join(process.cwd(), "public/briefing/frame.png"));
  const frameData = `image/png;base64,${frame.toString("base64")}`;
  let count = 0;
  const slideFrames: Array<{ id: number; date?: string | null }> = [];
  const chartSpecs: MonitorDocumentChart[] = [];
  function addChart(slide: Slide, chart: MonitorDocumentChart, box: Box) {
    chartSpecs.push(chart); nativeChart(slide, chart, box);
  }
  function newSlide(id: number, date?: string | null, note?: string) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addImage({ data: frameData, x: 0, y: 0, w: W, h: H });
    // White text belongs to the green title band.
    slide.addText(input.monitors.find(m => m.id === id)?.responsibleSector ?? briefingClass(id), { x: W * .3232, y: H * .04124, w: W * .5267, h: H * .082, fontFace: "Arial", fontSize: 28.01, color: "FFFFFF", bold: true, align: "center", valign: "middle", margin: 0, fit: "shrink" });
    slide.addText(briefingDate(date), { x: W * .80852, y: H * .96368, w: W * .19129, h: H * .03679, fontFace: "Arial", fontSize: 12.2, color: "000000", bold: true, align: "center", margin: 0, fit: "shrink" });
    slide.addNotes(`Monitor ${id}. ${note ?? ""} Data do conteúdo: ${date ?? "não informada"}. Moldura decorativa derivada do modelo fornecido. Textos, tabelas e gráficos são objetos nativos. Figuras permanecem imagens.`);
    count++; slideFrames.push({ id, date });
    return slide;
  }
  function systemSlide(monitorId: number, screen: CcoScreenId, title: string) {
    const date = screen === "rpn" || screen.startsWith("units-rpn-") ? input.rpn?.source.importedAt : latestFinancialDate(input.sag, input.rpn);
    const slide = newSlide(monitorId, date, `${title}. SAG: ${input.sag?.source.fileName ?? "ausente"}. RPNP: ${input.rpn?.source.fileName ?? "ausente"}.`);
    text(slide, title, { ...CONTENT, h: .45 }, 23, true);
    return slide;
  }
  const body = { ...CONTENT, y: CONTENT.y + .65, h: CONTENT.h - .75 };
  function summary(monitorId: number, screen: CcoScreenId, title: string, values: Array<[string, string]>, chart?: MonitorDocumentChart) {
    const slide = systemSlide(monitorId, screen, title);
    table(slide, ["Indicador", "Situação"], values, { ...body, w: chart ? body.w * .47 : body.w, h: Math.min(body.h, values.length * .43 + .5) });
    if (chart) addChart(slide, chart, { ...body, x: body.x + body.w * .51, w: body.w * .49 });
  }
  function rowsSlides(monitorId: number, screen: CcoScreenId, columns: string[], rows: string[][], size: number) {
    const pages = chunks(rows, size);
    let last: Slide | undefined;
    pages.forEach((page, i) => {
      const title = CCO_SCREEN_CATALOG.find((s) => s.id === screen)?.label ?? screen;
      const slide = systemSlide(monitorId, screen, `${title}${pages.length > 1 ? ` (${i + 1}/${pages.length})` : ""}`);
      last = slide;
      if (page.length) table(slide, columns, page, { ...body, h: body.h - .4 });
      else text(slide, "Nenhum registro nesta fonte.", body);
    });
    return last!;
  }
  function system(monitorId: number, screen: CcoScreenId) {
    const sag = input.sag!, rpn = input.rpn!;
    const current = sag.totals, previous = rpn.totals;
    if (screen === "pis") return rowsSlides(monitorId, screen, ["PI", "Descrição", "Recebido", "% Emp.", "% Liq."], sag.byPi.map((p) => [p.pi, p.piName ?? "", currency(p.snapshot.total), percent(p.snapshot.committedPercent), percent(p.snapshot.liquidatedPercent)]), CCO_PI_ROWS_PER_PAGE);
    if (screen.startsWith("units-")) {
      const prefix = screen.endsWith("160") ? "160" : "167";
      if (screen.startsWith("units-current")) rowsSlides(monitorId, screen, ["UG", "OM", "Recebido", "% Emp.", "% Liq."], sag.byUg.filter((u) => u.ug.startsWith(prefix)).map((u) => [u.ug, u.acronym ?? "", currency(u.snapshot.total), percent(u.snapshot.committedPercent), percent(u.snapshot.liquidatedPercent)]), CCO_UNIT_ROWS_PER_PAGE);
      else rowsSlides(monitorId, screen, ["UG", "OM", "Inscrito", "% Liq.", "% Canc."], rpn.byUg.filter((u) => u.ug.startsWith(prefix)).map((u) => [u.ug, u.acronym ?? "", currency(u.snapshot.inscribed), percent(u.snapshot.liquidatedPercent), percent(u.snapshot.cancelledPercent)]), CCO_UNIT_ROWS_PER_PAGE);
      return;
    }
    if (screen === "briefing") {
      const slide = rowsSlides(monitorId, screen, ["Classe", "Recebido", "% Emp.", "% Liq.", "% Liq. anterior"], CCO_CLASS_SLIDES.map((c) => {
        const e = buildCcoClassExecution(c.id, sag.rows, rpn.rows);
        return [c.label, currency(e.current.total), percent(e.current.committedPercent), percent(e.current.liquidatedPercent), percent(e.previous.liquidatedPercent)];
      }), 8);
      text(slide, `PI não mapeados: ${findUnmappedPis(sag.rows).length} no exercício e ${findUnmappedPis(rpn.rows).length} no anterior.`, { ...body, y: body.y + body.h - .3, h: .3 }, 11);
      return;
    }
    if (screen.startsWith("class-")) {
      const e = buildCcoClassExecution(screen as CcoClassId, sag.rows, rpn.rows);
      summary(monitorId, screen, CCO_CLASS_SLIDES.find((c) => c.id === screen)?.title ?? screen, [
        ["Previsto", currency(e.plannedKnownTotal) + (e.plannedComplete ? "" : " + pendente/EXTRA")], ["Recebido", currency(e.current.total)], ["Empenhado", percent(e.current.committedPercent)], ["Liquidado", percent(e.current.liquidatedPercent)], ["Disponível", currency(e.current.available)], ["Inscrito anterior", currency(e.previous.inscribed)], ["A liquidar anterior", currency(e.previous.toLiquidate)], ["Liquidado anterior", percent(e.previous.liquidatedPercent)], ["Cancelado anterior", percent(e.previous.cancelledPercent)],
      ]);
      rowsSlides(monitorId, screen, ["Finalidade", "Previsto", "Recebido", "% Emp.", "% Liq.", "Créd. ant.", "% Liq. ant."], e.groups.map(({ group, current: c, previous: p, matchedCurrentRows, matchedPreviousRows }) => [`${group.label}\n${matchedCurrentRows} linha(s) exercício / ${matchedPreviousRows} anterior`, group.planned === undefined ? group.plannedLabel ?? "Pendente" : currency(group.planned), currency(c.total), percent(c.committedPercent), percent(c.liquidatedPercent), currency(p.inscribed), percent(p.liquidatedPercent)]), 8);
      return;
    }
    if (screen === "rpn") return summary(monitorId, screen, "Créditos do exercício anterior", [["Total inscrito", currency(previous.inscribed)], ["A liquidar", currency(previous.toLiquidate)], ["Liquidado", currency(previous.liquidated)], ["Cancelado", currency(previous.cancelled)], ["% liquidado", percent(previous.liquidatedPercent)], ["% cancelado", percent(previous.cancelledPercent)]]);
    if (screen === "execution") return summary(monitorId, screen, "Execução Orçamentária", [["Crédito recebido", currency(current.total)], ["Empenhado", percent(current.committedPercent)], ["Liquidado", percent(current.liquidatedPercent)]], { type: "bar", orientation: "horizontal", title: "Composição do crédito", series: [{ name: "Valor (R$)", categories: ["Disponível", "A liquidar", "Em liquidação", "Liquidado", "Pago"], values: [current.available, current.toLiquidate, current.inLiquidation, current.liquidated, current.paid] }] });
    summary(monitorId, screen, "Visão executiva", [["Empenhado", percent(current.committedPercent)], ["Liquidado", percent(current.liquidatedPercent)], ["Crédito recebido", currency(current.total)], ["Disponível", currency(current.available)], ["Anterior inscrito", currency(previous.inscribed)], ["Anterior a liquidar", currency(previous.toLiquidate)], ["Anterior liquidado", percent(previous.liquidatedPercent)]], { type: "bar", orientation: "horizontal", title: "Maior volume recebido por OM", series: [{ name: "Recebido (R$)", categories: sag.byUg.slice(0, 8).map((u) => `${u.acronym ?? u.ug} (${u.ug})`), values: sag.byUg.slice(0, 8).map((u) => u.snapshot.total) }] });
  }
  async function documentScene(scene: MonitorDocumentSceneDto) {
    const layout = scene.payload.layout;
    if (!layout) throw new Error(`Documento ${scene.sourceFileName} sem layout estruturado. Reprocesse antes de exportar.`);
    const elements = prepareMonitorElements(layout.elements).elements.sort((a, b) => a.z - b.z);
    const adaptiveTable = monitorTableSlide(elements);
    if (adaptiveTable) {
      const title = adaptiveTable.texts.filter((t) => t.y < adaptiveTable.table.y).map((t) => t.text).join("\n") || scene.title;
      const after = adaptiveTable.texts.filter((t) => t.y >= adaptiveTable.table.y).map((t) => t.text).join("\n");
      chunks(adaptiveTable.table.rows, 10).forEach((rows) => {
        const slide = newSlide(scene.monitorId, scene.sourceImportedAt, `${scene.sourceFileName}, página ${scene.sourcePage}.`);
        text(slide, title, { ...CONTENT, h: .6 }, 22, true);
        table(slide, adaptiveTable.table.columns, rows, { ...body, h: body.h - (after ? .8 : .3) });
        if (after) text(slide, after, { ...body, y: body.y + body.h - .7, h: .5 }, 12);
      });
      return;
    }
    const slide = newSlide(scene.monitorId, scene.sourceImportedAt, `${scene.sourceFileName}, página ${scene.sourcePage}.`);
    // Letterbox source layout inside the model's available content area.
    const ratio = layout.width / layout.height;
    const w = Math.min(CONTENT.w, CONTENT.h * ratio), h = w / ratio;
    const area = { x: CONTENT.x + (CONTENT.w - w) / 2, y: CONTENT.y + (CONTENT.h - h) / 2, w, h };
    const box = (e: MonitorSlideBox): Box => ({ x: area.x + e.x * w, y: area.y + e.y * h, w: e.w * w, h: e.h * h });
    for (const e of elements) {
      if (e.w <= 0 || e.h <= 0) continue;
      const b = box(e);
      if (e.kind === "text") slide.addText(e.text, { ...b, fontFace: "Arial", fontSize: (e.fontSizePt ?? 18) * w / (layout.width / 914400), bold: e.bold || e.role === "title" || e.role === "metric", align: e.align ?? "left", valign: e.verticalAlign === "middle" ? "middle" : e.verticalAlign === "bottom" ? "bottom" : "top", color: hex(presentationTextColor(e, elements, true), "172B24"), margin: 0, fit: "shrink" });
      else if (e.kind === "shape") slide.addShape(e.radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { ...b, fill: { color: hex(e.fill), transparency: e.fill ? 0 : 100 }, line: { color: hex(e.lineColor), transparency: e.lineColor ? 0 : 100 } });
      else if (e.kind === "chart") addChart(slide, e.chart, b);
      else if (e.kind === "table") table(slide, e.columns, e.rows, b);
      else {
        if (!e.assetId) throw new Error(`Figura sem recurso em ${scene.sourceFileName}.`);
        const asset = await input.loadAsset(e.assetId, scene.monitorId);
        if (!asset) throw new Error(`Figura indisponível em ${scene.sourceFileName}.`);
        const data = `${asset.mimeType};base64,${Buffer.from(asset.data).toString("base64")}`;
        slide.addImage({ data, ...b, sizing: { type: "contain", ...b } });
      }
    }
  }
  for (const monitor of [...input.monitors].sort((a, b) => a.id - b.id)) {
    if (!monitor.enabled) {
      text(newSlide(monitor.id, null), "Monitor desativado", CONTENT, 24, true);
      continue;
    }
    if (monitor.screens.length && (!input.sag || !input.rpn)) throw new Error(`Monitor ${monitor.id}: par SAG incompleto. Carregue as fontes antes de exportar.`);
    for (const screen of monitor.screens) system(monitor.id, screen);
    const scenes = input.scenes[monitor.id] ?? [];
    for (const scene of scenes) await documentScene(scene);
    if (!monitor.screens.length && !scenes.length) text(newSlide(monitor.id, null), "Sem conteúdo selecionado", CONTENT, 24, true);
  }
  const draft = await pptx.write({ outputType: "nodebuffer", compression: true }) as Buffer;
  return { buffer: await applyOriginalBriefingFrame(draft, slideFrames, chartSpecs), slideCount: count };
}

export function latestFinancialDate(sag: SagImportResult | null, rpn: RpnImportResult | null) {
  return latestBriefingUpdate(sag?.source.importedAt, rpn?.source.importedAt);
}

const xmlEscape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Preserve the actual template shapes, gradients, emblems and typography.
// Only the template's class and update date are replaced. Generated content stays native.
async function applyOriginalBriefingFrame(buffer: Buffer, frames: Array<{ id: number; date?: string | null }>, charts: MonitorDocumentChart[]) {
  const [output, source] = await Promise.all([
    JSZip.loadAsync(buffer), JSZip.loadAsync(await readFile(path.join(process.cwd(), "public/briefing/model.pptx"))),
  ]);
  const sourceSlide = await source.file("ppt/slides/slide1.xml")!.async("string");
  const sourceRels = await source.file("ppt/slides/_rels/slide1.xml.rels")!.async("string");
  let shapes = sourceSlide.split("</p:grpSpPr>")[1].split("</p:spTree>")[0];
  shapes = shapes.replace(/<p:cNvPr id="\d+"/g, (match, offset) => `<p:cNvPr id="${100000 + offset}"`);
  const relationships: string[] = [];
  for (const match of sourceRels.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const node = match[0];
    const id = node.match(/\bId="([^"]+)"/)?.[1];
    const target = node.match(/\bTarget="([^"]+)"/)?.[1];
    if (!id || !target || !node.includes("/image")) continue;
    const newId = `rIdBriefing${relationships.length + 1}`;
    const name = `briefing-${path.posix.basename(target)}`;
    const sourcePath = path.posix.normalize(`ppt/slides/${target}`);
    const media = source.file(sourcePath);
    if (!media) throw new Error("Recurso da moldura de briefing ausente.");
    output.file(`ppt/media/${name}`, await media.async("nodebuffer"));
    shapes = shapes.replaceAll(`r:embed="${id}"`, `r:embed="${newId}"`);
    relationships.push(`<Relationship Id="${newId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${name}"/>`);
  }
  for (const [i, frame] of frames.entries()) {
    const slidePath = `ppt/slides/slide${i + 1}.xml`;
    let slide = await output.file(slidePath)!.async("string");
    let removed = 0;
    slide = slide.replace(/<p:(pic|sp)\b[\s\S]*?<\/p:\1>/g, (node) => removed++ < 3 ? "" : node);
    const personalized = shapes.replace(/<a:t>Classe II[\s\S]*?<\/a:t>/, `<a:t>${xmlEscape(briefingClass(frame.id))}</a:t>`)
      .replace(/<a:t>Atualizado em[\s\S]*?<\/a:t>/, `<a:t>${xmlEscape(briefingDate(frame.date))}</a:t>`);
    // Generated group properties may be self-closing.
    slide = slide.replace(/(<p:grpSpPr\b[^>]*\/>|<p:grpSpPr\b[\s\S]*?<\/p:grpSpPr>)/, `$1${personalized}`);
    output.file(slidePath, slide);
    const relPath = `ppt/slides/_rels/slide${i + 1}.xml.rels`;
    const rels = await output.file(relPath)!.async("string");
    output.file(relPath, rels.replace("</Relationships>", `${relationships.join("")}</Relationships>`));
  }
  // Include any source image MIME types absent from the generated package.
  let types = await output.file("[Content_Types].xml")!.async("string");
  const sourceTypes = await source.file("[Content_Types].xml")!.async("string");
  for (const match of sourceTypes.matchAll(/<Default\b[^>]*\/>/g)) {
    const ext = match[0].match(/Extension="([^"]+)"/)?.[1];
    if (ext && !types.includes(`Extension="${ext}"`)) types = types.replace("</Types>", `${match[0]}</Types>`);
  }
  output.file("[Content_Types].xml", types);
  for (const [i, chart] of charts.entries()) {
    const chartPath = `ppt/charts/chart${i + 1}.xml`;
    let chartXml = await output.file(chartPath)!.async("string");
    let seriesIndex = 0;
    chartXml = chartXml.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, (node) => {
      const series = chart.series[seriesIndex++];
      if (!series) return node;
      const points = (series.pointColors ?? []).flatMap((color, index) => color ? [`<c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill><a:srgbClr val="${hex(color)}"/></a:solidFill></c:spPr></c:dPt>`] : []).join("");
      if (points) node = node.replace(/(<c:dLbls>|<c:cat>|<c:xVal>)/, `${points}$1`);
      const labels = (series.dataLabels ?? []).flatMap((label, index) => label == null ? [] : [`<c:dLbl><c:idx val="${index}"/><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${xmlEscape(label)}</a:t></a:r></a:p></c:rich></c:tx><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbl>`]).join("");
      if (labels) node = node.replace("<c:dLbls>", `<c:dLbls>${labels}`);
      // Keep gaps absent in numeric caches, rather than turning them into zeroes.
      if (series.missingValueIndices?.length) node = node.replace(/<c:numCache>[\s\S]*?<\/c:numCache>/g, (cache) => cache.replace(/<c:pt idx="(\d+)">[\s\S]*?<\/c:pt>/g, (point, index) => series.missingValueIndices!.includes(Number(index)) ? "" : point));
      return node;
    });
    if (chart.categoryReverse) chartXml = chartXml.replace(/<c:catAx>[\s\S]*?<\/c:catAx>/g, (axis) => axis.replace(/<c:orientation val="minMax"\/>/, '<c:orientation val="maxMin"/>'));
    if (chart.valueReverse) chartXml = chartXml.replace(/<c:valAx>[\s\S]*?<\/c:valAx>/g, (axis) => axis.replace(/<c:orientation val="minMax"\/>/, '<c:orientation val="maxMin"/>'));
    output.file(chartPath, chartXml);
  }
  return output.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
