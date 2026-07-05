import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoLogin } from "@/components/DemoLogin";
import { Card } from "@/components/ui";
import { PageTransition } from "@/components/PageTransition";

export default function LoginPage() {
  return (
    <PageTransition>
      <div className="min-h-screen relative flex flex-col">
        {/* Background Image with Veil */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ backgroundImage: "url('/bg.png')" }}
        />
        {/* Transluced Dark Veil */}
        <div className="absolute inset-0 z-0 bg-zinc-950/60 backdrop-blur-sm" />

        <div className="relative z-10">
          <DemoBanner />
        </div>

        <main className="relative z-10 flex-1 grid place-items-center px-4 py-8">
          <div className="w-full max-w-[440px]">
            <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors drop-shadow-md">
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Voltar para a capa
            </Link>

            <Card className="p-6 bg-white dark:bg-zinc-900/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border-white/20">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <BrandLogo className="h-12 w-12 shrink-0 drop-shadow-md" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">MCL Auth</p>
                      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">Acesso ao sistema</h1>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    Entre com email e senha demonstrativos para abrir o painel do piloto.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <LockKeyhole aria-hidden className="h-5 w-5" />
                </span>
              </div>

              <DemoLogin />
            </Card>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-300 drop-shadow-md">
              Ambiente demonstrativo. Os dados do piloto sao sinteticos e nao constituem sistema oficial.
            </p>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

