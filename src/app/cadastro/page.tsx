import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { RegisterForm } from "@/components/RegisterForm";
import { Card } from "@/components/ui";
import { PageTransition } from "@/components/PageTransition";

export const metadata = {
  title: "Cadastro — MCL Piloto Classe II",
  description: "Crie sua conta no Sistema MCL para acessar o painel logístico.",
};

export default function CadastroPage() {
  return (
    <PageTransition>
      <div className="min-h-screen relative flex flex-col">
        {/* Background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ backgroundImage: "url('/bg.png')" }}
        />
        <div className="absolute inset-0 z-0 bg-zinc-950/60 backdrop-blur-sm" />

        <main className="relative z-10 flex-1 grid place-items-center px-4 py-8">
          <div className="w-full max-w-[440px]">
            <Link
              href="/entrar"
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors drop-shadow-md"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Voltar para o login
            </Link>

            <Card className="p-6 bg-white dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border-white/20">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <BrandLogo className="h-12 w-12 shrink-0 drop-shadow-md" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">MCL Auth</p>
                      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">Criar conta</h1>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    Registre-se para acessar o sistema logístico.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <UserPlus aria-hidden className="h-5 w-5" />
                </span>
              </div>

              <RegisterForm />
            </Card>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-300 drop-shadow-md">
              Após o cadastro, você será direcionado para completar seu perfil de acesso.
            </p>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
