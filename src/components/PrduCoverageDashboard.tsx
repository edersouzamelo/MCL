import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { class2CoverageReferenceSnapshot } from "@/modules/logistics/class2-prdu-reference";
import { isPrduTargetMet } from "@/modules/logistics/prdu-siscofis";

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatCoverage(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PrduCoverageDashboard() {
  const snapshot = class2CoverageReferenceSnapshot;
  const prduItems = snapshot.items.filter((item) => item.inPrdu);
  const outsidePrdu = snapshot.items.filter((item) => !item.inPrdu);
  const covered = prduItems.filter((item) => isPrduTargetMet(item.coveragePrdu));
  const deficit = prduItems.filter((item) => !isPrduTargetMet(item.coveragePrdu));
  const ordered = [...prduItems].sort((a, b) => a.coveragePrdu - b.coveragePrdu);
  const lowest = ordered[0];

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Cobertura logística real de referência</Badge>
              <Badge tone="neutral">Classe II</Badge>
            </div>
            <h2 className="mt-3 text-xl font-bold text-zinc-950 dark:text-zinc-50">{snapshot.title}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A visão compara o índice de necessidade do ePRDU com a posição de estoque disponível oriunda do SISCOFIS. O objetivo operacional é atingir pelo menos 1,00 PRDU por item.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span><strong className="text-zinc-900 dark:text-zinc-200">Atualização:</strong> {formatDate(snapshot.updatedAt)}</span>
            <span><strong className="text-zinc-900 dark:text-zinc-200">Posição do estoque:</strong> {formatDate(snapshot.stockPositionDate)}</span>
            <span><strong className="text-zinc-900 dark:text-zinc-200">PRDU:</strong> referência {snapshot.prduReferenceYear}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Itens no PRDU</p>
            <p className="mt-2 text-2xl font-extrabold text-zinc-950 dark:text-white">{prduItems.length}</p>
            <p className="mt-1 text-xs text-zinc-500">Base da comparação atual</p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Cobertura ≥ 1 PRDU</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">{covered.length}</p>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">Meta quantitativa atingida</p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">Cobertura &lt; 1 PRDU</p>
            <p className="mt-2 text-2xl font-extrabold text-rose-800 dark:text-rose-300">{deficit.length}</p>
            <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-400/80">Itens abaixo da referência</p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400">Menor cobertura</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-900 dark:text-amber-300">{lowest ? `${formatCoverage(lowest.coveragePrdu)} PRDU` : "—"}</p>
            <p className="mt-1 truncate text-xs text-amber-800/80 dark:text-amber-400/80">{lowest?.itemLabel ?? "Sem dado"}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Cobertura por item</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Ordenado da menor para a maior cobertura. A linha de referência operacional é 1 PRDU.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href="/necessidades">Abrir Necessidades</Link>
            <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href="/armazenagem">Abrir Armazenagem</Link>
            <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href="/importacao">Abrir Input</Link>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className="px-3 py-2.5">Material</th>
                <th className="px-3 py-2.5">Cobertura</th>
                <th className="px-3 py-2.5">Situação</th>
                <th className="px-3 py-2.5">Leitura visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {ordered.map((item) => {
                const targetMet = isPrduTargetMet(item.coveragePrdu);
                const progress = Math.min(100, item.coveragePrdu * 100);
                return (
                  <tr key={item.itemKey} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/35">
                    <td className="px-3 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{item.itemLabel}</td>
                    <td className="px-3 py-3 font-mono text-zinc-800 dark:text-zinc-200">{formatCoverage(item.coveragePrdu)} PRDU</td>
                    <td className="px-3 py-3"><Badge tone={targetMet ? "good" : "bad"}>{targetMet ? "≥ 1 PRDU" : "< 1 PRDU"}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="h-2.5 min-w-48 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className={targetMet ? "h-full rounded-full bg-emerald-600" : "h-full rounded-full bg-rose-600"} style={{ width: `${progress}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {outsidePrdu.length ? (
          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <strong className="text-zinc-900 dark:text-zinc-200">Fora do PRDU:</strong> {outsidePrdu.map((item) => item.itemLabel).join(", ")}. Estes itens são preservados no snapshot, mas não entram nos indicadores de cobertura PRDU.
          </div>
        ) : null}
      </Card>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <strong className="text-amber-900 dark:text-amber-300">Limite declarado:</strong> {snapshot.sourceNote} O MCL não trata este snapshot como integração automática com ePRDU ou SISCOFIS.
      </div>
    </div>
  );
}
