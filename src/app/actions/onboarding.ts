"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
      console.error("Erro no banco de dados (completeOnboarding), usando memória temporária:", error);
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
    }
  } else {
    const state = getDemoState();
    const userIndex = state.users.findIndex(u => u.id === session.user?.id);
    if (userIndex >= 0) {
      state.users[userIndex] = {
        ...state.users[userIndex],
        ...data,
      };
    }
  }

  revalidatePath("/");
  redirect("/inicio");
}

export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const mode = persistenceMode();

  if (mode === "postgresql") {
    try {
      return await prisma.user.findUnique({
        where: { id: session.user.id },
      });
    } catch (error) {
      console.error("Erro no banco de dados (getUserProfile), usando memória temporária:", error);
      const state = getDemoState();
      let user = state.users.find(u => u.id === session.user?.id);
      if (!user) {
        user = {
          id: session.user.id,
          name: session.user.name || "Operador",
          email: session.user.email || "",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any;
        state.users.push(user as any);
      }
      return user;
    }
  } else {
    const state = getDemoState();
    let user = state.users.find(u => u.id === session.user?.id);
    if (!user) {
      user = {
        id: session.user.id,
        name: session.user.name || "Operador",
        email: session.user.email || "",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;
      state.users.push(user as any);
    }
    return user;
  }
}
