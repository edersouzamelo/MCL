import { AppShell } from "@/components/AppShell";
import { Badge, Card, InlineLink, PageHeader, formatDateTime } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function DivergencesPage() {
  const state = getDemoState();

  return (
    <AppShell>
      <PageHeader
        title="Divergencias"
        description="Alertas preservam o estado fisico e registram correcao por novo evento, sem apagar historico."
      />
      <div className="grid gap-4">
        {state.divergences.map((divergence) => {
          const unit = state.logisticsUnits.find((candidate) => candidate.id === divergence.objectId);
          return (
            <Card key={divergence.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{divergence.persistentCode}</p>
                  <h2 className="text-lg font-semibold">{divergence.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">Detectada em {formatDateTime(divergence.detectedAt)} por {divergence.sourceSystem}.</p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={divergence.status === "CORRIGIDA" ? "good" : "bad"}>{divergence.status}</Badge>
                  <Badge tone="warn">{divergence.severity}</Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <p className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm"><strong>Esperado:</strong> {divergence.expected}</p>
                <p className="rounded bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm"><strong>Observado:</strong> {divergence.observed}</p>
              </div>
              {unit ? <p className="mt-3 text-sm"><InlineLink href={`/unidades/${unit.qrToken}`}>Abrir passaporte da unidade</InlineLink></p> : null}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
