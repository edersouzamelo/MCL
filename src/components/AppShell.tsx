import Link from "next/link";
import { Activity, AlertTriangle, ClipboardList, CreditCard, Gauge, Landmark, PackageCheck, Search, ShoppingCart, Truck, Warehouse } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/DemoBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
import { PageTransition } from "@/components/PageTransition";
import { TechnicalFooter } from "@/components/TechnicalFooter";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions/onboarding";

const metaNav = [
  { href: "/necessidades", label: "Necessidade", icon: ClipboardList },
  { href: "/credito", label: "Credito", icon: CreditCard },
  { href: "/aquisicoes", label: "Aquisicao", icon: ShoppingCart },
  { href: "/scanner", label: "Recebimento", icon: PackageCheck },
  { href: "/armazenagem", label: "Armazenagem", icon: Warehouse },
  { href: "/entrega", label: "Entrega", icon: Truck },
];

const nav = [
  { href: "/painel", label: "Painel", icon: Gauge },
  { href: "/necessidades", label: "Necessidades", icon: ClipboardList },
  { href: "/analises/materiais", label: "CATMAT e Atas", icon: Search },
  { href: "/aquisicoes", label: "Aquisicoes", icon: Landmark },
  { href: "/conectores", label: "Conectores", icon: Activity },
  { href: "/divergencias", label: "Divergencias", icon: AlertTriangle },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile();
  if (profile && !profile.termsAcceptedAt) redirect("/primeiro-acesso");
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors">
      <ServiceWorkerRegister />
      <DemoBanner />
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/inicio" className="flex items-center gap-3"><BrandLogo className="h-14 w-14" priority /></Link>
          <nav className="flex flex-wrap gap-2">
            {metaNav.map((item) => <Link key={item.href} href={item.href} className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded border border-emerald-900/30 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-zinc-900 dark:text-zinc-300"><item.icon className="h-4 w-4 text-emerald-800 dark:text-emerald-500" />{item.label}</Link>)}
          </nav>
          <UserSettingsMenu />
        </div>
        <div className="mx-auto flex max-w-7xl px-4 py-3">
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => <Link key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"><item.icon className="h-4 w-4" />{item.label}</Link>)}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6"><PageTransition>{children}</PageTransition></main>
      <TechnicalFooter />
    </div>
  );
}
