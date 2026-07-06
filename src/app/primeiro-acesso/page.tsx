import React from "react";
import OnboardingForm from "@/components/OnboardingForm";
import { getUserProfile } from "@/app/actions/onboarding";
import { redirect } from "next/navigation";

export default async function PrimeiroAcessoPage() {
  const profile = await getUserProfile();

  if (!profile) {
    // Se não tiver perfil, provavelmente não está autenticado. Redireciona pro login.
    redirect("/entrar");
  }

  if (profile.termsAcceptedAt) {
    // Já completou o onboarding
    redirect("/inicio");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat blur-sm opacity-45" 
          style={{ backgroundImage: 'url(/bg.png)' }} 
        />
        {/* Dark overlay to ensure high contrast */}
        <div className="absolute inset-0 bg-zinc-950/60" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Primeiro Acesso</h2>
          <p className="mt-2 text-sm text-zinc-450 dark:text-zinc-400">
            Para continuar utilizando o MCL, precisamos que você complete seu cadastro.
          </p>
        </div>
      </div>

      <div className="mt-8 relative z-10 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-zinc-900/60 backdrop-blur-md py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-zinc-800">
          <OnboardingForm initialName={profile.name || ""} />
        </div>
      </div>
    </div>
  );
}
