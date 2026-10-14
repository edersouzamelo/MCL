/** Ordem configurada primeiro; arquivos novos sem ordem entram ao final do loop. */
export type OrderedMonitorImport = {
  id: string;
  displayOrder?: number | null;
  approvedAt: Date | string | null;
};

export function compareApprovedDocumentImports(a: OrderedMonitorImport, b: OrderedMonitorImport) {
  const aRank = a.displayOrder;
  const bRank = b.displayOrder;
  if (aRank != null && bRank != null && aRank !== bRank) return aRank - bRank;
  if (aRank != null && bRank == null) return -1;
  if (aRank == null && bRank != null) return 1;

  const approvedA = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
  const approvedB = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
  return approvedA - approvedB || a.id.localeCompare(b.id);
}

export function reorderDocumentIds(ids: string[], movedId: string, beforeId: string) {
  const from = ids.indexOf(movedId);
  const to = ids.indexOf(beforeId);
  if (from < 0 || to < 0 || from === to) return ids;
  const result = [...ids];
  result.splice(from, 1);
  result.splice(to, 0, movedId);
  return result;
}
