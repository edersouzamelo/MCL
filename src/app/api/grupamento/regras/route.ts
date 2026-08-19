import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { parseSagRuleWorkbook } from "@/modules/grupamento/rules";
import { appendAuditLog } from "@/server/demo-store";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_ROLES = new Set(["ADMIN", "LOGISTICS_MANAGER", "COMMAND_VIEWER"]);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as string[];

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  }
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    return NextResponse.json({ error: "Permissão insuficiente para importar matriz de regras." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo de regras não informado." }, { status: 400 });
  }

  const extension = file.name.toLowerCase().split(".").pop();
  if (!extension || !["xls", "xlsx"].includes(extension)) {
    return NextResponse.json({ error: "Formato não suportado. Use .xls ou .xlsx." }, { status: 415 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo vazio ou acima do limite de 10 MB." }, { status: 413 });
  }

  try {
    const result = parseSagRuleWorkbook(await file.arrayBuffer(), file.name);
    const success = result.groups.length > 0;

    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_RULE_IMPORT",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: file.name,
      organizationId: session.user.organizationId,
      outcome: success ? "SUCESSO" : "ERRO",
      reason: success
        ? "Matriz de regras Classes/PI importada para classificação determinística."
        : "Arquivo aceito, mas sem tabela Classes/PI reconhecida.",
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        groupCount: result.groups.length,
        briefingRuleCount: result.briefingRules.length,
        conflictCount: result.conflicts.length,
        rawFilePersisted: false,
      },
    });

    return NextResponse.json(result, { status: success ? 200 : 422 });
  } catch (error) {
    appendAuditLog({
      actorId: session.user.id,
      action: "SAG_RULE_IMPORT",
      resourceType: "GRUPAMENTO_CCO",
      resourceId: file.name,
      organizationId: session.user.organizationId,
      outcome: "ERRO",
      reason: "Falha ao interpretar matriz de regras.",
      metadata: {
        fileName: file.name,
        rawFilePersisted: false,
        error: error instanceof Error ? error.message : "erro desconhecido",
      },
    });
    return NextResponse.json({ error: "Falha ao interpretar a matriz de regras." }, { status: 400 });
  }
}
