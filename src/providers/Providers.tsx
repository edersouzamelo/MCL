"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/contexts/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <SettingsProvider>{children}</SettingsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
