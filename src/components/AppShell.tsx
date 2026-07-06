import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  FileInput,
  Gauge,
  History,
  Landmark,
  QrCode,
  Search,
  ClipboardList,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/DemoBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
import { PageTransition } from "@/components/PageTransition";
import { TechnicalFooter } from "@/components/TechnicalFooter";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions/onboarding";

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

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  
  if (profile && !profile.termsAcceptedAt) {
    redirect("/primeiro-acesso");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors flex flex-col relative">
      {/* Background Image Layer for dark theme only */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none hidden dark:block">
        <div 
          className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat blur-sm opacity-45" 
          style={{ backgroundImage: 'url(/bg.png)' }} 
        />
        {/* Dark overlay to ensure high contrast */}
        <div className="absolute inset-0 bg-zinc-950/50" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <ServiceWorkerRegister />
        <DemoBanner />
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/80 backdrop-blur-md transition-colors relative z-20">
          <div className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 transition-colors">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <Link href="/inicio" className="flex items-center gap-3">
                <BrandLogo className="h-10 w-10 shrink-0 transition-all" priority />
                <span className="font-bold text-lg text-zinc-900 dark:text-zinc-50 tracking-tight">MCL</span>
              </Link>
              
              <UserSettingsMenu />
            </div>
          </div>
          <div className="mx-auto flex max-w-7xl px-4 py-3">
            <nav aria-label="Menu principal" className="flex flex-wrap gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/85 hover:text-zinc-950 dark:hover:text-white transition-all duration-200"
                >
                  <item.icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 relative flex-1 z-10">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <TechnicalFooter />
      </div>
    </div>
  );
}
