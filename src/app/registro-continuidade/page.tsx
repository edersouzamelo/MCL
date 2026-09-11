import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, MetricCard, PageHeader } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function LogisticsContinuityRegistryPage() {
  const state = getDemoState();
  const sourceSystems = new Set(state.events.map((event) => event.sourceSystem)).size;
  const openDivergences = state.divergences.filter((divergence) => divergence.status !== "CORRIGIDA").length;

  return (
    <AppShell>
      <PageHeader
        title="Registro de Continuidade Logística"
        description="Camada federada de eventos, vínculos e projeções do MCL. Preserva a origem e a autoridade de cada dado, sem fundir os bancos dos sistemas participantes."
        action={<Badge tone="info">Ambiente demonstrativo</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Eventos registrados" value={state.events.length} detail="Ocorrências imutáveis da trajetória" tone="good" />
        <MetricCard label="Vínculos entre objetos" value={state.objectLinks.length} detail="Correlação sem apagar identificadores" />
        <MetricCard label="Unidades logísticas" value={state.logisticsUnits.length} detail="Passaportes digitais no recorte atual" />
        <MetricCard label="Divergências abertas" value={openDivergences} detail={`${sourceSystems} fontes presentes nos eventos`} tone={openDivergences ? "warn" : "good"} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">O que pertence ao registro</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Eventos", "Fatos datados, append-only, com natureza, confiança e fonte declaradas."],
              ["Vínculos", "Relações explícitas entre necessidade, crédito, aquisição, lote e unidade logística."],
              ["Projeções", "Visões consolidadas calculadas a partir dos eventos, sem substituir o dado oficial."],
              ["Proveniência", "Referências que permitem retornar ao sistema e ao registro de autoridade."],
            ].map(([title, description]) => (
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800" key={title}>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Limite arquitetural</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            O registro não é um “banco central de dados”. Sistemas oficiais continuam sendo autoridades em seus domínios; o MCL mantém continuidade, correlação e evidência auditável.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm">
            <Link className="font-semibold text-sky-700 hover:underline dark:text-sky-400" href="/conectores">Consultar fontes e maturidade</Link>
            <Link className="font-semibold text-sky-700 hover:underline dark:text-sky-400" href="/auditoria">Abrir trilha de auditoria</Link>
            <Link className="font-semibold text-sky-700 hover:underline dark:text-sky-400" href="/divergencias">Revisar divergências</Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
