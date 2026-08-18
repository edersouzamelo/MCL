"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PageTransition } from "@/components/PageTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <PageTransition>{children}</PageTransition>
      </SettingsProvider>
    </SessionProvider>
  );
}
