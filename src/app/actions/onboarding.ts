"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { revalidatePath } from "next/cache";

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

  const mode = persistenceMode();

  if (mode === "postgresql") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: data,
    });
  } else {
    const state = getDemoState();
    const userIndex = state.users.findIndex(u => u.id === session.user.id);
    if (userIndex >= 0) {
      state.users[userIndex] = {
        ...state.users[userIndex],
        ...data,
      };
    }
  }

  revalidatePath("/");
  
  return { success: true };
}

export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const mode = persistenceMode();

  if (mode === "postgresql") {
    return await prisma.user.findUnique({
      where: { id: session.user.id },
    });
  } else {
    const state = getDemoState();
    return state.users.find(u => u.id === session.user.id) || null;
  }
}
