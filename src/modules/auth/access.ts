import type { Role } from "@/modules/domain/types";
import type { DemoState, UserScope } from "@/modules/domain/types";
import { getDemoState } from "@/server/demo-store";
import { prisma } from "@/server/db";

export type LocalIdentity = {
  id?: string | null;
  email?: string | null;
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
