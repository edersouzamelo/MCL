import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/modules/auth/options";
import { appendAuditLog, getDemoState } from "@/server/demo-store";

export const runtime = "nodejs";

const importRecordSchema = z.object({
  persistentCode: z.string().min(3).max(80),
  quantity: z.coerce.number().positive().max(100000),
  sourceSystem: z.string().min(3).max(80),
});

function sanitizeCsvCell(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const { format, content } = (await request.json()) as { format?: string; content?: string };
  if (!content || content.length > 200_000) {
    return NextResponse.json({ error: "Conteudo ausente ou acima do limite." }, { status: 400 });
  }

  const state = getDemoState();
  const rows =
    format === "json"
      ? (JSON.parse(content) as unknown[])
      : (parse(content, { columns: true, skip_empty_lines: true, trim: true }) as unknown[]);

  let accepted = 0;
  let rejected = 0;

  for (const rawRow of rows) {
    const sanitizedRow = Object.fromEntries(
      Object.entries(rawRow as Record<string, unknown>).map(([key, value]) => [key, sanitizeCsvCell(value)]),
    );
    const parsed = importRecordSchema.safeParse(sanitizedRow);
    if (parsed.success) {
      accepted += 1;
    } else {
      rejected += 1;
      state.quarantine.unshift({
        id: `quarantine-${Date.now()}-${rejected}`,
        sourceSystem: String((sanitizedRow as { sourceSystem?: unknown }).sourceSystem ?? "IMPORT"),
        sourceRecordId: String((sanitizedRow as { persistentCode?: unknown }).persistentCode ?? "SEM-CODIGO"),
        reason: parsed.error.issues.map((issue) => issue.message).join("; "),
        payload: sanitizedRow,
        createdAt: new Date().toISOString(),
      });
    }
  }

  appendAuditLog({
    actorId: session.user.id,
    action: "IMPORTACAO_VALIDADA",
    resourceType: "IMPORT_BATCH",
    resourceId: `import-${Date.now()}`,
    organizationId: session.user.organizationId,
    outcome: rejected ? "ERRO" : "SUCESSO",
    reason: `${accepted} aceitos; ${rejected} em quarentena.`,
    metadata: { format, accepted, rejected },
  });

  return NextResponse.json({ accepted, rejected, quarantineSize: state.quarantine.length });
}
