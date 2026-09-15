import { AppShell } from "@/components/AppShell";
import { PcaNeedsClient } from "@/components/needs/PcaNeedsClient";

export const dynamic = "force-dynamic";

export default function NeedsPage() {
  return (
    <AppShell>
      <PcaNeedsClient />
    </AppShell>
  );
}
