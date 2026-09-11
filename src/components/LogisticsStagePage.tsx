import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getDiagnosticData } from "@/modules/connectors/catalog";
import { logisticsStageById, type LogisticsStageId } from "@/modules/logistics/stages";
import { getDemoState } from "@/server/demo-store";

function maturityLabel(status: string) {
  if (status === "SAUDAVEL") return "Capacidade disponível";
  if (status === "FALHA") return "Falha registrada";
  if (status === "ATRASADO") return "Fonte atrasada";
  if (status === "NAO_INTEGRADO") return "Mapeado, não integrado";
  if (status === "NAO_CONFIGURADO") return "Não configurado";
  if (status === "DESCONHECIDO") return "Lacuna a mapear";
  return "Pendente";
}

function maturityTone(status: string): "neutral" | "good" | "warn" | "bad" | "info" {
  if (status === "SAUDAVEL") return "good";
  if (status === "FALHA") return "bad";
  if (status === "ATRASADO" || status === "NAO_CONFIGURADO") return "warn";
  if (status === "PENDENTE") return "info";
  return "neutral";
}

export function LogisticsStagePage({ stageId }: { stageId: LogisticsStageId }) {
  const stage = logisticsStageById(stageId);
  const systems = getDiagnosticData(getDemoState()).systems.filter((system) => system.domain === stage.domain);

  return (
    <AppShell>
      <PageHeader title={`${stage.number}. ${stage.title}`} description={stage.objective} action={<Badge tone="info">Etapa {stage.number} de 08</Badge>} />
      <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-sm text-zinc-700 dark:text-zinc-300">
        <strong className="text-amber-900 dark:text-amber-300">Estado do módulo:</strong>{" "}
        esta página consolida o escopo e a maturidade conhecida. Fontes pendentes ou não integradas não são apresentadas como operação oficial.
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.45fr)]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fontes e capacidades relacionadas</p><h2 className="mt-1 text-lg font-bold text-zinc-950 dark:text-zinc-100">{stage.domain}</h2></div>
            <Badge tone={systems.length ? "info" : "warn"}>{systems.length} mapeada(s)</Badge>
          </div>
          {systems.length ? (
            <ul className="mt-5 space-y-3">
              {systems.map((system) => (
                <li key={system.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div><h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{system.name}</h3><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{system.observation}</p></div>
                    <Badge tone={maturityTone(system.status)}>{maturityLabel(system.status)}</Badge>
                  </div>
                  {system.limitations.length ? <p className="mt-3 text-xs leading-relaxed text-zinc-500">Limite declarado: {system.limitations[0]}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">Nenhuma fonte foi catalogada para esta etapa. Trata-se de uma lacuna explícita do mapeamento.</p>}
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Acessos relacionados</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {stageId === "recebimento" ? <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href="/scanner">Abrir scanner QR</Link> : null}
            {stageId === "armazenagem" || stageId === "entrega" ? <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href="/painel">Abrir situação geral</Link> : null}
            <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href={`/conectores?dominio=${stageId}`}>Revisar conectores desta etapa</Link>
            <Link className="mcl-inline-link font-semibold text-sky-700 dark:text-sky-400" href="/auditoria">Consultar auditoria</Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
