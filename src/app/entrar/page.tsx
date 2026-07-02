import { LogIn } from "lucide-react";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoLogin } from "@/components/DemoLogin";
import { Card } from "@/components/ui";
import { INSTITUTIONAL_IDENTITY_NOTICE } from "@/modules/domain/types";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <DemoBanner />
      <main className="mx-auto grid min-h-[calc(100vh-36px)] max-w-5xl items-center gap-6 px-4 py-8 lg:grid-cols-[1fr_420px]">
        <section>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded bg-emerald-700 text-white">
            <LogIn aria-hidden className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold text-zinc-950">MCL | Piloto Classe II</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-zinc-700">
            O objeto e identificado; o evento e registrado; a origem e preservada; o MCL correlaciona necessidade,
            aquisicao, orcamento e fluxo fisico; o motor analisa; e a autoridade competente decide.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">{INSTITUTIONAL_IDENTITY_NOTICE}</p>
        </section>
        <Card>
          <h2 className="mb-1 text-xl font-semibold text-zinc-950">Acesso demonstrativo</h2>
          <p className="mb-4 text-sm text-zinc-600">
            OAuth social e apenas demonstracao de autenticacao federada. Os dados do piloto sao sinteticos.
          </p>
          <DemoLogin />
        </Card>
      </main>
    </div>
  );
}
