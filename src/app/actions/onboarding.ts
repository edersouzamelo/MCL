"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function completeOnboarding(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }

  const data = {
    rank: formData.get("rank") as string,
    address: formData.get("address") as string,
    phone: formData.get("phone") as string,
    whatsapp: formData.get("whatsapp") as string,
    militaryRole: formData.get("militaryRole") as string,
    militaryOrganization: formData.get("militaryOrganization") as string,
    termsAcceptedAt: new Date().toISOString(),
  };

  // Salva no banco se o banco estiver disponível
  const mode = persistenceMode();
  if (mode === "postgresql") {
    try {
      await prisma.user.upsert({
        where: { id: session.user.id },
        update: data,
        create: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          ...data,
        },
      });
    } catch (error) {
      console.error("Erro no banco de dados (completeOnboarding), usando fallback:", error);
    }
  }

  // Sempre atualiza o estado em memória para a sessão atual
  const state = getDemoState();
  const userIndex = state.users.findIndex(u => u.id === session.user?.id);
  if (userIndex >= 0) {
    state.users[userIndex] = {
      ...state.users[userIndex],
      ...data,
    } as any;
  } else {
    state.users.push({
      id: session.user.id,
      name: session.user.name || "Operador",
      email: session.user.email || "",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    } as any);
  }

  // Persiste o onboarding completo em cookies seguros para evitar loops em ambientes serverless
  const cookieStore = await cookies();
  cookieStore.set("mcl_onboarding_completed", "true", { maxAge: 60 * 60 * 24 * 365, path: "/" });
  cookieStore.set("mcl_user_profile", JSON.stringify(data), { maxAge: 60 * 60 * 24 * 365, path: "/" });

  revalidatePath("/");
  redirect("/inicio");
}

export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const mode = persistenceMode();

  // 1. Tenta carregar do banco de dados se habilitado
  if (mode === "postgresql") {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
      if (dbUser && dbUser.termsAcceptedAt) {
        return dbUser;
      }
    } catch (error) {
      console.error("Erro no banco de dados ao buscar perfil, usando fallback:", error);
    }
  }

  // 2. Fallback: Tenta ler dos cookies da sessão do navegador
  const cookieStore = await cookies();
  const onboardingCompleted = cookieStore.get("mcl_onboarding_completed")?.value;
  const userProfileCookie = cookieStore.get("mcl_user_profile")?.value;

  if (onboardingCompleted === "true") {
    let parsedProfile = {};
    if (userProfileCookie) {
      try {
        parsedProfile = JSON.parse(userProfileCookie);
      } catch {}
    }
    return {
      id: session.user.id,
      name: session.user.name || "Operador Demonstrativo",
      email: session.user.email || "",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      termsAcceptedAt: new Date().toISOString(),
      ...parsedProfile,
    } as any;
  }

  // 3. Fallback: Tenta ler da memória do processo (para sessões rápidas/testes)
  const state = getDemoState();
  const user = state.users.find(u => u.id === session.user?.id);
  if (user && user.termsAcceptedAt) {
    return user;
  }

  // 4. Se não preencheu em nenhum lugar, retorna dados básicos com termsAcceptedAt null
  // (isso forçará o redirecionamento para o onboarding)
  return {
    id: session.user.id,
    name: session.user.name || "Operador Demonstrativo",
    email: session.user.email || "",
    termsAcceptedAt: null,
  } as any;
}
