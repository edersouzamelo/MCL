import { randomUUID } from "node:crypto";
import type { Role } from "@/modules/domain/types";
import type { DemoState, UserScope } from "@/modules/domain/types";
import { getDemoState } from "@/server/demo-store";
import { prisma } from "@/server/db";

export const MCL_ADMIN_EMAIL = "edersouzamelo@gmail.com";
export const CONGRESS_VISITOR_PROFILE = "Visitante - 1º Congresso de Gestão da Cadeia de suprimento COLOG";

export type LocalIdentity = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export type LocalAccess = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  organizationId: string;
  roles: Role[];
};

function activeScope(scope: Pick<UserScope, "active" | "validFrom" | "validUntil">, now: Date) {
  if (!scope.active || new Date(scope.validFrom) > now) {
    return false;
  }
  return !scope.validUntil || new Date(scope.validUntil) > now;
}
function accessForScopes(
  user: { id: string; name?: string | null; email?: string | null; image?: string | null },
  scopes: UserScope[],
  now: Date,
): LocalAccess | undefined {
  const currentScopes = scopes.filter((scope) => activeScope(scope, now));
  const organizationId = currentScopes[0]?.organizationId;
  if (!organizationId) {
    return undefined;
  }

  const roles = [
    ...new Set(
      currentScopes
        .filter((scope) => scope.organizationId === organizationId)
        .map((scope) => scope.role),
    ),
  ];
  if (roles.length === 0) {
    return undefined;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    organizationId,
    roles,
  };
}

export function resolveAccessFromState(
  state: Pick<DemoState, "users" | "userScopes">,
  identity: LocalIdentity,
  now = new Date(),
) {
  const normalizedEmail = identity.email?.trim().toLowerCase();
  const user = state.users.find(
    (candidate) =>
      candidate.active &&
      ((identity.id && candidate.id === identity.id) ||
        (normalizedEmail && candidate.email.toLowerCase() === normalizedEmail)),
  );
  if (!user) {
    return undefined;
  }

  return accessForScopes(
    user,
    state.userScopes.filter((scope) => scope.userId === user.id),
    now,
  );
}

export async function resolveLocalAccess(identity: LocalIdentity, now = new Date()) {
  if (!process.env.DATABASE_URL) {
    return resolveAccessFromState(getDemoState(), identity, now);
  }

  const normalizedEmail = identity.email?.trim().toLowerCase();
  const conditions = [
    identity.id ? { id: identity.id } : undefined,
    normalizedEmail ? { email: normalizedEmail } : undefined,
  ].filter((condition): condition is { id: string } | { email: string } => Boolean(condition));

  if (conditions.length === 0) {
    return undefined;
  }

  const user = await prisma.user.findFirst({
    where: { active: true, OR: conditions },
    include: { scopes: true },
  });
  if (!user) {
    return undefined;
  }

  return accessForScopes(
    user,
    user.scopes.map((scope) => ({
      ...scope,
      validFrom: scope.validFrom.toISOString(),
      validUntil: scope.validUntil?.toISOString(),
    })),
    now,
  );
}

/**
 * Autoaprovisionamento controlado para o congresso.
 * O Google comprova a identidade; o MCL cria apenas um vínculo READ_ONLY na mesma
 * organização operacional do administrador. Nenhuma permissão administrativa é concedida.
 */
export async function provisionGoogleVisitor(identity: LocalIdentity, now = new Date()) {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  const email = identity.email?.trim().toLowerCase();
  if (!email) {
    return undefined;
  }

  const owner = await prisma.user.findUnique({
    where: { email: MCL_ADMIN_EMAIL },
    include: { scopes: true },
  });
  const ownerScope = owner?.scopes.find((scope) =>
    activeScope(
      {
        active: scope.active,
        validFrom: scope.validFrom.toISOString(),
        validUntil: scope.validUntil?.toISOString(),
      },
      now,
    ),
  );

  // Sem vínculo operacional real do administrador, não inventamos uma organização.
  if (!ownerScope) {
    return undefined;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { scopes: true },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          active: true,
          name: identity.name ?? existing.name,
          image: identity.image ?? existing.image,
        },
      })
    : await prisma.user.create({
        data: {
          id: identity.id || randomUUID(),
          email,
          name: identity.name,
          image: identity.image,
          active: true,
          prefTheme: "dark",
          prefAnimations: true,
          prefLanguage: "pt-BR",
          prefFontSize: "media",
        },
      });

  const activeExistingScope = existing?.scopes.find((scope) =>
    activeScope(
      {
        active: scope.active,
        validFrom: scope.validFrom.toISOString(),
        validUntil: scope.validUntil?.toISOString(),
      },
      now,
    ),
  );

  if (!activeExistingScope) {
    await prisma.userScope.create({
      data: {
        userId: user.id,
        organizationId: ownerScope.organizationId,
        supplyClass: ownerScope.supplyClass,
        role: "READ_ONLY",
        validFrom: now,
        active: true,
      },
    });
  }

  return resolveLocalAccess({ id: user.id, email: user.email, name: user.name, image: user.image }, now);
}
