import { CheckCircle } from "lucide-react";
import { DEMO_NOTICE } from "@/modules/domain/types";

export function DemoBanner() {
  const runtimeNotice = process.env.DATABASE_URL
    ? undefined
    : "MODO MEMÓRIA";

  return (
    <div className="flex items-center justify-center gap-2 bg-emerald-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-emerald-950 border-b border-emerald-200 shadow-sm">
      <CheckCircle aria-hidden className="h-4 w-4 shrink-0 text-emerald-700" />
      <span>{runtimeNotice ? `${DEMO_NOTICE} | ${runtimeNotice}` : DEMO_NOTICE}</span>
    </div>
  );
}
