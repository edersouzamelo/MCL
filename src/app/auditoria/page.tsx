import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader, formatDateTime } from "@/components/ui";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  const state = getDemoState();

  return (
    <AppShell>
      <PageHeader
        title="Trilha de auditoria"
        description="Logs append-only demonstrativos para reconstruir consultas, leitura de QR, importacao e registro de eventos."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2">Quando</th>
                <th>Ator</th>
                <th>Acao</th>
                <th>Recurso</th>
                <th>Resultado</th>
                <th>Razao</th>
              </tr>
            </thead>
            <tbody>
              {state.auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-100">
                  <td className="py-3">{formatDateTime(log.occurredAt)}</td>
                  <td>{log.actorId}</td>
                  <td>{log.action}</td>
                  <td>{log.resourceType}:{log.resourceId}</td>
                  <td><Badge tone={log.outcome === "SUCESSO" ? "good" : "bad"}>{log.outcome}</Badge></td>
                  <td>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
