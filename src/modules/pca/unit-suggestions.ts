import type { PcaUnitOption } from "@/modules/pca/contracts";

type UnitDirectoryEntry = Omit<PcaUnitOption, "suggested" | "reason">;

export function suggestPcaUnits(units: UnitDirectoryEntry[], userUasg?: string | null): PcaUnitOption[] {
  const own = units.find((unit) => unit.uasg === userUasg);
  const parentUasg = own?.type === "SUBORDINADA" ? own.superiorUasg : own?.uasg;

  return units
    .map((unit) => {
      const isOwn = unit.uasg === userUasg;
      const isSubordinate = Boolean(parentUasg && unit.superiorUasg === parentUasg && !isOwn);
      return {
        ...unit,
        suggested: isOwn || isSubordinate,
        reason: isOwn ? "USER_ORGANIZATION" as const : isSubordinate ? "SUBORDINATE" as const : "OTHER" as const,
      };
    })
    .sort((a, b) => {
      const rank = { USER_ORGANIZATION: 0, SUBORDINATE: 1, OTHER: 2 };
      return rank[a.reason] - rank[b.reason] || a.name.localeCompare(b.name, "pt-BR");
    });
}
