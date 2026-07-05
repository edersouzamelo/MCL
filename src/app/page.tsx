import Link from "next/link";
import { ArrowRight, Boxes, Database, Route, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/DemoBanner";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DemoBanner />
      <main className="mx-auto flex min-h-[calc(100vh-36px)] w-full max-w-7xl flex-col justify-between px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="MCL">
            <span className="text-lg font-semibold">MCL</span>
          </Link>
          <Link
            href="/entrar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300 hover:bg-white/10"
          >
            Entre
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <section className="grid items-end gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-semibold uppercase text-emerald-300">Piloto Classe II</p>
            <h1 className="max-w-4xl">
              <span className="sr-only">MCL</span>
              <BrandLogo
                tone="light"
                priority
                className="h-auto w-[min(62vw,300px)] drop-shadow-[0_20px_55px_rgba(255,255,255,0.16)] sm:w-[360px] lg:w-[430px]"
                sizes="(max-width: 640px) 62vw, (max-width: 1024px) 360px, 430px"
              />
            </h1>
            <p className="mt-4 text-2xl font-semibold text-zinc-100 sm:text-3xl">Modelo de Continuidade Logistica</p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              Interface demonstrativa para acompanhar necessidade, aquisicao, credito, estoque, unidade logistica,
              remessa e entrega em uma unica cadeia informacional.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/entrar"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-emerald-500 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Entre
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-l border-white/10 pl-5 text-sm text-zinc-300">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-white/10 text-emerald-300">
                <Boxes aria-hidden className="h-5 w-5" />
              </span>
              <span>Rastreabilidade por unidade logistica</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-white/10 text-sky-300">
                <Route aria-hidden className="h-5 w-5" />
              </span>
              <span>Fluxo material e informacional correlacionado</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-white/10 text-amber-300">
                <Database aria-hidden className="h-5 w-5" />
              </span>
              <span>Dados sinteticos para demonstracao controlada</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-white/10 text-rose-300">
                <ShieldCheck aria-hidden className="h-5 w-5" />
              </span>
              <span>Auditoria e preservacao da origem do dado</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
