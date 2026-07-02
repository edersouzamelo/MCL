import { AppShell } from "@/components/AppShell";
import { ImportForm } from "@/components/ImportForm";
import { Card, PageHeader } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const state = getDemoState();

  return (
    <AppShell>
      <PageHeader
        title="Importacao CSV/JSON"
        description="Validador server-side para cargas sinteticas. Registros invalidos seguem para quarentena."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <ImportForm />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Quarentena</h2>
          <ul className="space-y-3 text-sm">
            {state.quarantine.map((record) => (
              <li key={record.id} className="rounded bg-zinc-50 p-3">
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
