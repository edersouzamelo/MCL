import { ShieldAlert } from "lucide-react";
import { DEMO_NOTICE } from "@/modules/domain/types";

export function DemoBanner() {
  const runtimeNotice = process.env.DATABASE_URL
    ? undefined
    : "MODO MEMORIA - DADOS NAO PERSISTENTES";

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-300 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-stone-950">
      <ShieldAlert aria-hidden className="h-4 w-4 shrink-0" />
      <span>{runtimeNotice ? `${DEMO_NOTICE} | ${runtimeNotice}` : DEMO_NOTICE}</span>
    </div>
  );
}
