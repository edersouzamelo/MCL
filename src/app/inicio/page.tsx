import Link from "next/link";
import { ArrowRight, ClipboardList, CreditCard, ShoppingCart, PackageCheck, Warehouse, Truck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageTransition } from "@/components/PageTransition";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";

const metaNav = [
  { href: "/necessidades", label: "Necessidade", icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-400/10" },
  { href: "/painel", label: "Crédito", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { href: "/aquisicoes", label: "Aquisição", icon: ShoppingCart, color: "text-amber-400", bg: "bg-amber-400/10" },
  { href: "/scanner", label: "Recebimento", icon: PackageCheck, color: "text-violet-400", bg: "bg-violet-400/10" },
  { href: "/painel", label: "Armazenagem", icon: Warehouse, color: "text-rose-400", bg: "bg-rose-400/10" },
  { href: "/painel", label: "Entrega", icon: Truck, color: "text-sky-400", bg: "bg-sky-400/10" },
];

export default function InicioPage() {
  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white overflow-hidden">
        
        {/* Floating User Menu */}
        <div className="absolute top-6 right-6 z-50">
          <UserSettingsMenu />
        </div>

        {/* Background Image Container with Blur */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div 
            className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat blur-sm" 
            style={{ backgroundImage: 'url(/bg.png)' }} 
          />
          {/* Dark overlay to ensure contrast */}
          <div className="absolute inset-0 bg-zinc-950/70" />
        </div>

        <main className="relative z-10 mx-auto flex h-screen w-full max-w-7xl flex-col items-center justify-center px-5 sm:px-8 py-10">
          
          <div className="flex flex-col items-center text-center mb-16">
            <BrandLogo
              tone="light"
              priority
              className="h-28 w-28 sm:h-36 sm:w-36 drop-shadow-[0_10px_25px_rgba(255,255,255,0.1)] mb-8"
            />
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              Ciclo Logístico
            </h1>
            <p className="mt-4 text-lg text-zinc-300 max-w-2xl drop-shadow-md">
              Acompanhe necessidade, aquisição, crédito, estoque, remessa e entrega em uma única cadeia informacional contínua.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
            {metaNav.map((item, i) => (
              <Link 
                key={i} 
                href={item.href}
                className="group relative flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <span className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-16">
            <Link
              href="/painel"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 font-semibold text-white transition hover:bg-emerald-500 shadow-lg hover:shadow-emerald-600/30"
            >
              Acessar Situação Geral
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
          </div>
          
        </main>
      </div>
    </PageTransition>
  );
}
