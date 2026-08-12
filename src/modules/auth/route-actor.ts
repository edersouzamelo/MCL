import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { getAuthRuntimeConfiguration } from "@/modules/auth/config";
import type { Role } from "@/modules/domain/types";

export type RouteActor = {
  id: string;
  organizationId?: string;
  roles: Role[];
};

export async function getRouteActor(): Promise<RouteActor | undefined> {
  const session = await getServerSession(authOptions);
  const roles = (session?.user?.roles ?? []) as Role[];
  if (!session?.user?.id || !session.user.organizationId || roles.length === 0) {
    return undefined;
  }

  return {
    id: session.user.id,
    organizationId: session.user.organizationId,
    roles,
  };
}

export function demoMemoryFallbackAllowed() {
  return getAuthRuntimeConfiguration().demo.configured;
}
