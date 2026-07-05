import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  CreditCard,
  FileInput,
  Gauge,
  History,
  Landmark,
  PackageCheck,
  QrCode,
  Search,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/DemoBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
import { PageTransition } from "@/components/PageTransition";
import { TechnicalFooter } from "@/components/TechnicalFooter";

const metaNav = [
  { href: "/necessidades", label: "Necessidade", icon: ClipboardList },
  { href: "/painel", label: "Crédito", icon: CreditCard },
  { href: "/aquisicoes", label: "Aquisição", icon: ShoppingCart },
  { href: "/scanner", label: "Recebimento", icon: PackageCheck },
  { href: "/painel", label: "Armazenagem", icon: Warehouse },
  { href: "/painel", label: "Entrega", icon: Truck },
];

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors">
      <ServiceWorkerRegister />
      <DemoBanner />
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors">
        <div className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 transition-colors">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/inicio" className="flex items-center gap-3">
              <BrandLogo className="h-14 w-14 shrink-0 transition-all" priority />
            </Link>
            
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <nav aria-label="Módulos do ciclo logístico" className="overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                <ol className="flex min-w-max items-center gap-2 lg:min-w-0 lg:justify-end">
                  {metaNav.map((item, index) => (
                    <li key={item.label} className="flex items-center gap-2">
                      <Link
                        href={item.href}
                        className="inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded border border-emerald-900/30 dark:border-emerald-500/30 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm transition hover:border-emerald-700 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-950 dark:hover:text-emerald-300"
                      >
                        <item.icon aria-hidden className="h-4 w-4 shrink-0 text-emerald-800 dark:text-emerald-500" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </Link>
                      {index < metaNav.length - 1 ? (
                        <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-emerald-900/45 dark:text-emerald-500/45" />
                      ) : null}
                    </li>
                  ))}
                </ol>
              </nav>
              
              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden lg:block"></div>
              
              <UserSettingsMenu />
            </div>
            
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl px-4 py-3">
          <nav aria-label="Menu principal" className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                <item.icon aria-hidden className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 relative flex-1">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <TechnicalFooter />
    </div>
  );
}
