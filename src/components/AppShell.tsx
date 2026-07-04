import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardList,
  FileInput,
  Gauge,
  History,
  Landmark,
  QrCode,
  Search,
} from "lucide-react";
import { DemoBanner } from "@/components/DemoBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const nav = [
  { href: "/painel", label: "Painel", icon: Gauge },
  { href: "/necessidades", label: "Necessidades", icon: ClipboardList },
  { href: "/analises/materiais", label: "CATMAT e Atas", icon: Search },
  { href: "/aquisicoes", label: "Aquisicoes", icon: Landmark },
  { href: "/scanner", label: "Scanner", icon: QrCode },
  { href: "/conectores", label: "Conectores", icon: Activity },
  { href: "/divergencias", label: "Divergencias", icon: AlertTriangle },
  { href: "/importacao", label: "Importacao", icon: FileInput },
  { href: "/auditoria", label: "Auditoria", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <ServiceWorkerRegister />
      <DemoBanner />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/painel" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-emerald-700 text-white">
              <Boxes aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold">MCL | Piloto Classe II</span>
              <span className="block text-xs text-zinc-500">Continuidade informacional logistica</span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              >
                <item.icon aria-hidden className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
