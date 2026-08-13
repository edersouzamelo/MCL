import type { Role } from "@/modules/domain/types";

export function canManageCatmat(roles: Role[] = []) {
  return roles.includes("ADMIN") || roles.includes("LOGISTICS_MANAGER");
}
