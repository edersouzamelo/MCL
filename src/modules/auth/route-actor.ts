import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import type { Role } from "@/modules/domain/types";

export type RouteActor = {
  id: string;
  organizationId?: string;
  roles: Role[];
  demoFallback: boolean;
};

const demoActor: RouteActor = {
  id: "user-demo-admin",
  organizationId: "org-provedor-alfa",
  roles: ["ADMIN", "LOGISTICS_MANAGER", "WAREHOUSE_OPERATOR", "AUDITOR"],
  demoFallback: true,
};

function canUseDemoActor() {
  return !process.env.DATABASE_URL && process.env.DEMO_AUTH_ENABLED !== "false" && process.env.NODE_ENV !== "test";
}

export async function getRouteActor(): Promise<RouteActor | undefined> {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      id: session.user.id,
      organizationId: session.user.organizationId,
      roles: (session.user.roles ?? ["READ_ONLY"]) as Role[],
      demoFallback: false,
    };
  }

  return canUseDemoActor() ? demoActor : undefined;
}

export function demoMemoryFallbackAllowed() {
  return canUseDemoActor();
}
