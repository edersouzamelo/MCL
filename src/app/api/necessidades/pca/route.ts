import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { suggestPcaUnits } from "@/modules/pca/unit-suggestions";
import { listPcaItems, syncPcaItems } from "@/modules/pca/repository";

export const runtime = "nodejs";
export const maxDuration = 120;

function validYear(value: string | null) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2021 && year <= new Date().getFullYear() + 2 ? year : null;
}

async function contextFor(sessionOrganizationId: string, requestedUasg?: string | null) {
  const current = await prisma.organization.findUnique({ where: { id: sessionOrganizationId } });
  if (!current) throw new Error("Organização da sessão não localizada.");

  const target = requestedUasg
    ? await prisma.organization.findFirst({ where: { uasg: requestedUasg, active: true } })
    : current;
  if (!target) throw new Error("A UASG selecionada ainda não está vinculada a uma organização do MCL.");

  const allowed = target.id === current.id || target.parentId === current.id;
  if (!allowed) throw new Error("A unidade selecionada não pertence ao escopo autorizado do usuário.");
  return { current, target };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  const url = new URL(request.url);
  const year = validYear(url.searchParams.get("year"));
  if (!year) return NextResponse.json({ error: "Exercício inválido." }, { status: 400 });

  try {
    const { current, target } = await contextFor(session.user.organizationId, url.searchParams.get("uasg"));
    const items = await listPcaItems(target.id, year);
    const scopedOrganizations = await prisma.organization.findMany({
      where: { active: true, OR: [{ id: current.id }, { parentId: current.id }] },
      orderBy: { name: "asc" },
    });
    const unitDirectory = scopedOrganizations
      .filter((organization): organization is typeof organization & { uasg: string } => Boolean(organization.uasg))
      .map((organization) => ({
        id: organization.id,
        name: organization.name,
        uasg: organization.uasg,
        type: organization.id === current.id ? "ENQUADRANTE" : "SUBORDINADA",
        superiorUasg: organization.id === current.id ? null : current.uasg,
      }));
    return NextResponse.json({
      unit: { id: target.id, name: target.name, uasg: target.uasg, configured: Boolean(target.uasg && target.pncpCnpj) },
      userUnit: { id: current.id, name: current.name, uasg: current.uasg },
      units: suggestPcaUnits(unitDirectory, current.uasg),
      year,
      items,
      lastSynchronizedAt: items[0]?.synchronizedAt ?? null,
      source: "PNCP",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao consultar o PCA." }, { status: 422 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  if (!session.user.roles?.some((role) => role === "ADMIN" || role === "LOGISTICS_MANAGER")) {
    return NextResponse.json({ error: "Permissão de gestor obrigatória para sincronizar o PCA." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { uasg?: string; year?: number };
  const year = validYear(body.year == null ? null : String(body.year));
  if (!year) return NextResponse.json({ error: "Exercício inválido." }, { status: 400 });
  try {
    const { target } = await contextFor(session.user.organizationId, body.uasg);
    const result = await syncPcaItems(target.id, year);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao sincronizar o PCA." }, { status: 422 });
  }
}
