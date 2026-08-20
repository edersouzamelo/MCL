import { AlertTriangle } from "lucide-react";
import type { CcoScreenId } from "@/modules/grupamento/monitor";
import type { RpnImportResult } from "@/modules/grupamento/rpn";
import type { SagImportResult, SagSnapshot } from "@/modules/grupamento/sag";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function GrupamentoBaseMonitorScreen({ screen, sag, rpn }: { screen: CcoScreenId; sag: SagImportResult; rpn: RpnImportResult }) {
  if (screen === "execution") return <Execution snapshot={sag.totals} />;
  if (screen === "rpn") return <RpnExecution rpn={rpn} />;
  if (screen === "pis") return <PiTable sag={sag} />;
  if (screen === "units") return <UnitTable sag={sag} />;
  if (screen === "provenance") return <Provenance sag={sag} rpn={rpn} />;
  return <Overview sag={sag} rpn={rpn} />;
}

function Overview({ sag, rpn }: { sag: SagImportResult; rpn: RpnImportResult }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Situação orçamentária</div>
        <h1 className="mt-3 text-5xl font-black tracking-tight">{percent(sag.totals.committedPercent)} empenhado</h1>
        <p className="mt-3 text-lg text-slate-400">{percent(sag.totals.liquidatedPercent)} liquidado no exercício · RPNP {percent(rpn.totals.liquidatedPercent)} liquidado</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <BigMetric label="Crédito recebido" value={currency(sag.totals.total)} />
          <BigMetric label="Disponível" value={currency(sag.totals.available)} />
          <BigMetric label="RPNP inscrito" value={currency(rpn.totals.inscribed)} />
          <BigMetric label="RPNP a liquidar" value={currency(rpn.totals.toLiquidate)} />
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Maior volume por PI — exercício</div>
        <div className="mt-5 space-y-4">
          {sag.byPi.slice(0, 7).map((item) => (
            <div key={item.pi} className="border-b border-white/10 pb-3 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><div className="font-mono text-xs text-sky-300">{item.pi}</div><div className="mt-1 truncate text-sm font-semibold">{item.piName || "PI sem descrição"}</div></div>
                <div className="text-right"><div className="text-lg font-black">{percent(item.snapshot.committedPercent)}</div><div className="text-xs text-slate-500">empenhado</div></div>
              </div>
            </div>
          ))}
          {!sag.byPi.length ? <p className="text-sm text-slate-500">A carga não contém detalhamento por PI.</p> : null}
        </div>
      </div>
    </div>
  );
}

function Execution({ snapshot }: { snapshot: SagSnapshot }) {
  const items = [
    ["Disponível", snapshot.available],
    ["A liquidar", snapshot.toLiquidate],
    ["Em liquidação", snapshot.inLiquidation],
    ["Liquidado", snapshot.liquidated],
    ["Pago", snapshot.paid],
  ] as const;
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        <BigMetric label="Execução empenhada" value={percent(snapshot.committedPercent)} />
        <BigMetric label="Execução liquidada" value={percent(snapshot.liquidatedPercent)} />
        <BigMetric label="Crédito recebido" value={currency(snapshot.total)} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        {items.map(([label, value]) => <BigMetric key={label} label={label} value={currency(value)} compact />)}
      </div>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        Fórmula auditável: recebido = disponível + a liquidar + em liquidação + liquidado + pago; empenhado = recebido − disponível; execução liquidada = (liquidado + pago) ÷ recebido.
      </div>
    </div>
  );
}

function RpnExecution({ rpn }: { rpn: RpnImportResult }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">RPNP / Restos a Pagar</div>
      <h1 className="mt-3 text-4xl font-black">Recursos remanescentes de ano anterior</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <BigMetric label="Total inscrito" value={currency(rpn.totals.inscribed)} />
        <BigMetric label="% liquidado" value={percent(rpn.totals.liquidatedPercent)} />
        <BigMetric label="% cancelado" value={percent(rpn.totals.cancelledPercent)} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <BigMetric label="A liquidar" value={currency(rpn.totals.toLiquidate)} compact />
        <BigMetric label="Liquidado" value={currency(rpn.totals.liquidated)} compact />
        <BigMetric label="Cancelado" value={currency(rpn.totals.cancelled)} compact />
      </div>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        Fórmula auditável: total inscrito = a liquidar + liquidado + cancelado; % liquidado = liquidado ÷ total inscrito; % cancelado = cancelado ÷ total inscrito.
      </div>
    </div>
  );
}

function PiTable({ sag }: { sag: SagImportResult }) {
  return <DataTable title="Planos Internos" columns={["PI", "Descrição", "Total", "% Emp.", "% Liq."]} rows={sag.byPi.slice(0, 12).map((item) => [item.pi, item.piName || "—", currency(item.snapshot.total), percent(item.snapshot.committedPercent), percent(item.snapshot.liquidatedPercent)])} empty="A carga não contém PI." />;
}

function UnitTable({ sag }: { sag: SagImportResult }) {
  return <DataTable title="Organizações / UG" columns={["UG", "Sigla", "Total", "% Emp.", "% Liq."]} rows={sag.byUg.slice(0, 12).map((item) => [item.ug, item.acronym || "—", currency(item.snapshot.total), percent(item.snapshot.committedPercent), percent(item.snapshot.liquidatedPercent)])} empty="A carga não contém UG." />;
}

function Provenance({ sag, rpn }: { sag: SagImportResult; rpn: RpnImportResult }) {
  const warnings = [...sag.warnings.map((warning) => `Exercício: ${warning}`), ...rpn.warnings.map((warning) => `RPNP: ${warning}`)];
  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Proveniência e confiança</div>
      <h1 className="mt-3 text-4xl font-black">Par SAG manual rastreável</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <BigMetric label="Exercício Corrente" value={sag.source.fileName} compact />
        <BigMetric label="RPNP" value={rpn.source.fileName} compact />
        <BigMetric label="Atualização exercício" value={new Date(sag.source.importedAt).toLocaleString("pt-BR")} compact />
        <BigMetric label="Atualização RPNP" value={new Date(rpn.source.importedAt).toLocaleString("pt-BR")} compact />
        <BigMetric label="Natureza" value="DADO IMPORTADO" compact />
        <BigMetric label="Persistência dos brutos" value="NÃO" compact />
        <BigMetric label="Linhas exercício" value={String(sag.rows.length)} compact />
        <BigMetric label="Linhas RPNP" value={String(rpn.rows.length)} compact />
      </div>
      {warnings.length ? (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-amber-200">
          <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Alertas da carga</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

function BigMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div><div className={`${compact ? "text-xl" : "text-3xl"} mt-2 break-words font-black tracking-tight`}>{value}</div></div>;
}

function DataTable({ title, columns, rows, empty }: { title: string; columns: string[]; rows: string[][]; empty: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">{title}</div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full table-fixed text-left">
          <thead className="bg-white/[0.05] text-xs uppercase tracking-wider text-slate-400"><tr>{columns.map((column) => <th key={column} className="px-4 py-4">{column}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/10 text-sm">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="bg-white/[0.02]">{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="truncate px-4 py-4 font-medium" title={cell}>{cell}</td>)}</tr>)}</tbody>
        </table>
        {!rows.length ? <div className="p-8 text-center text-sm text-slate-500">{empty}</div> : null}
      </div>
    </div>
  );
}
