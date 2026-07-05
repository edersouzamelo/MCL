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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Primeiro Acesso</h2>
          <p className="mt-2 text-sm text-gray-600">
            Para continuar utilizando o MCL, precisamos que você complete seu cadastro.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <OnboardingForm initialName={profile.name || ""} />
        </div>
      </div>
    </div>
  );
}
