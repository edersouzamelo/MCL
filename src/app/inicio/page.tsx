import Link from "next/link";
import { ArrowRight, ClipboardList, CreditCard, ShoppingCart, PackageCheck, Warehouse, Truck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageTransition } from "@/components/PageTransition";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
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

export default async function InicioPage() {
  const profile = await getUserProfile();
  if (profile && !profile.termsAcceptedAt) redirect("/primeiro-acesso");
  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white overflow-hidden">
        <div className="absolute top-6 right-6 z-50"><UserSettingsMenu /></div>
        <div className="absolute inset-0 z-0 overflow-hidden"><div className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat blur-sm" style={{ backgroundImage: 'url(/bg.png)' }} /><div className="absolute inset-0 bg-zinc-950/70" /></div>
        <main className="relative z-10 mx-auto flex h-screen w-full max-w-7xl flex-col items-center justify-center px-5 sm:px-8 py-10">
          <div className="flex flex-col items-center text-center mb-16"><BrandLogo tone="light" priority className="h-28 w-28 sm:h-36 sm:w-36 drop-shadow-[0_10px_25px_rgba(255,255,255,0.1)] mb-8" /><h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-lg">MCL</h1><p className="mt-4 text-lg text-zinc-300 max-w-2xl drop-shadow-md">Acompanhe necessidade, aquisicao, credito, estoque, remessa e entrega em uma unica cadeia informacional continua.</p></div>
          <div className="w-full flex justify-center"><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 w-full">
            {metaNav.map((item) => <Link key={item.href} href={item.href} className="flex flex-col items-center p-5 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 hover:bg-zinc-800/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-2"><div className="h-14 w-14 rounded-full flex items-center justify-center mb-4 bg-emerald-400/10 text-emerald-400"><item.icon className="h-7 w-7" strokeWidth={1.5} /></div><span className="text-sm sm:text-base font-semibold text-zinc-200">{item.label}</span></Link>)}
          </div></div>
          <div className="mt-16"><Link href="/painel" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 font-semibold text-white transition hover:bg-emerald-500 shadow-lg hover:shadow-emerald-600/30">Acessar Situacao Geral <ArrowRight aria-hidden className="h-5 w-5" /></Link></div>
        </main>
      </div>
    </PageTransition>
  );
}
