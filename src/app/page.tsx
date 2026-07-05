import Link from "next/link";
import { ArrowRight, Boxes, Database, Route, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageTransition } from "@/components/PageTransition";

export default function Home() {
  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white overflow-hidden">
        <DemoBanner />
      
      {/* Background Image Container with Blur */}
      <div className="absolute inset-0 top-[36px] z-0 overflow-hidden">
        <div 
          className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat blur-md" 
          style={{ backgroundImage: 'url(/bg.png)' }} 
        />
        {/* Dark overlay to ensure contrast */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <main className="relative z-10 mx-auto flex h-[calc(100vh-36px)] w-full max-w-7xl items-center justify-center px-5 sm:px-8 lg:px-10">
        
        <section className="grid w-full items-center gap-10 lg:grid-cols-2">
          {/* Logo on the left */}
          <div className="flex justify-center lg:justify-start">
            <BrandLogo
              tone="light"
              priority
              className="h-auto w-[min(70vw,360px)] drop-shadow-[0_20px_55px_rgba(255,255,255,0.16)] lg:w-[460px]"
              sizes="(max-width: 640px) 70vw, (max-width: 1024px) 360px, 460px"
            />
          </div>

          {/* Text and Icons on the right, with dark translucent veil */}
          <div className="flex flex-col rounded-3xl bg-black/60 p-8 backdrop-blur-xl border border-white/10 shadow-2xl">
            <h1 className="text-3xl font-semibold text-zinc-100 sm:text-4xl">
              Modelo de Continuidade Logística
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">
              Interface demonstrativa para acompanhar necessidade, aquisição, crédito, estoque, unidade logística,
              remessa e entrega em uma única cadeia informacional.
            </p>
            <div className="mt-8 mb-8 flex flex-wrap gap-3">
              <Link
                href="/entrar"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Acessar Plataforma
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 border-t border-white/10 pt-8 text-sm text-zinc-300">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900/10 text-emerald-300">
                  <Boxes aria-hidden className="h-5 w-5" />
                </span>
                <span>Rastreabilidade por unidade logística</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900/10 text-sky-300">
                  <Route aria-hidden className="h-5 w-5" />
                </span>
                <span>Fluxo material e informacional correlacionado</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900/10 text-amber-300">
                  <Database aria-hidden className="h-5 w-5" />
                </span>
                <span>Dados sintéticos para demonstração controlada</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900/10 text-rose-300">
                  <ShieldCheck aria-hidden className="h-5 w-5" />
                </span>
                <span>Auditoria e preservação da origem do dado</span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
    </PageTransition>
  );
}
