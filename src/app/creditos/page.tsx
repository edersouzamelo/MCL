import React from "react";
import { AppShell } from "@/components/AppShell";
import { CreditManagementClient } from "@/components/credits/CreditManagementClient";

export const dynamic = "force-dynamic";

export default function CreditosPage() {
  return (
    <AppShell>
      <CreditManagementClient />
    </AppShell>
  );
}
