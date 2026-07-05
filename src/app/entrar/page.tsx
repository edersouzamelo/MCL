import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoLogin } from "@/components/DemoLogin";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <DemoBanner />
      <main className="grid min-h-[calc(100vh-36px)] place-items-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950">
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Voltar para a capa
          </Link>

          <Card className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <BrandLogo className="h-12 w-12 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">MCL Auth</p>
                    <h1 className="text-2xl font-semibold text-zinc-950">Acesso ao sistema</h1>
                  </div>
                </div>
                <p className="text-sm leading-6 text-zinc-600">
                  Entre com email e senha demonstrativos para abrir o painel do piloto.
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-700">
                <LockKeyhole aria-hidden className="h-5 w-5" />
              </span>
            </div>

            <DemoLogin />
          </Card>

          <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
            Ambiente demonstrativo. Os dados do piloto sao sinteticos e nao constituem sistema oficial.
          </p>
        </div>
      </main>
    </div>
  );
}
