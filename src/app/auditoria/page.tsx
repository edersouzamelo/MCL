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
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 dark:text-zinc-400">
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
                <tr key={log.id} className="border-b border-zinc-150 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/35 transition-colors duration-150">
                  <td className="py-3 text-zinc-800 dark:text-zinc-300">{formatDateTime(log.occurredAt)}</td>
                  <td className="font-semibold text-zinc-900 dark:text-zinc-100">{log.actorId}</td>
                  <td className="text-zinc-700 dark:text-zinc-300">{log.action}</td>
                  <td className="font-mono text-xs text-zinc-650 dark:text-zinc-400">{log.resourceType}:{log.resourceId}</td>
                  <td><Badge tone={log.outcome === "SUCESSO" ? "good" : "bad"}>{log.outcome}</Badge></td>
                  <td className="text-xs text-zinc-550 dark:text-zinc-400 max-w-xs truncate" title={log.reason}>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
