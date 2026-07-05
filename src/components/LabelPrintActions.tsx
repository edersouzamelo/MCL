"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

export function LabelPrintActions({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <div className="mx-auto mb-6 flex max-w-lg flex-col gap-2 print:hidden sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => router.push(fallbackHref)}
        className="inline-flex items-center justify-center gap-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:bg-zinc-800/50"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Voltar
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center justify-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
      >
        <Printer aria-hidden className="h-4 w-4" />
        Imprimir / PDF
      </button>
    </div>
  );
}
