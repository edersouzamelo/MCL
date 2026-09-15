import { AppShell } from "@/components/AppShell";
import { ImportForm } from "@/components/ImportForm";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const state = getDemoState();

  return (
    <AppShell>
      <PageHeader
        title="Input e importação"
        description="Entrada controlada de fontes externas, com validação e confirmação antes da persistência."
      />

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Contratos logísticos ePRDU e SISCOFIS</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              O MCL já separa necessidade planejada de referência (ePRDU) e posição de estoque (SISCOFIS) no modelo de domínio. O fluxo alvo é upload, identificação da fonte, extração, prévia, confirmação humana e persistência.
            </p>
          </div>
          <Badge tone="warn">Parser documental pendente</Badge>
        </div>
        <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 text-sm text-zinc-700 dark:text-zinc-300">
          Nenhum PDF, XLSX ou CSV de ePRDU/SISCOFIS é tratado hoje como integração automática. O formulário abaixo continua sendo o importador sintético legado e permanece isolado do cálculo PRDU exibido em Situação Geral.
        </p>
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <div className="mb-4">
            <Badge tone="neutral">Importador sintético legado</Badge>
          </div>
          <ImportForm />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Quarentena</h2>
          <ul className="space-y-3 text-sm">
            {state.quarantine.map((record) => (
              <li key={record.id} className="rounded bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="font-semibold">{record.sourceRecordId}</p>
                <p className="text-zinc-600">{record.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
