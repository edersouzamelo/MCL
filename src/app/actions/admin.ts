"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { revalidatePath } from "next/cache";

export async function getAllUsers() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email || session.user.email !== "edersouzamelo@gmail.com") {
    throw new Error("Acesso negado");
  }

  const mode = persistenceMode();

  if (mode === "postgresql") {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } else {
    const state = getDemoState();
    return [...state.users].reverse(); // Simulation of desc ordering
  }
}

export async function cleanMockData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== "edersouzamelo@gmail.com") {
    throw new Error("Não autorizado");
  }

  if (persistenceMode() === "postgresql") {
    // Delete mappings first to avoid foreign key constraints
    const fakes = await prisma.catalogSearchCandidate.findMany({
      where: { sourceSystem: "MCL_SIMULADO" }
    });

    for (const fake of fakes) {
      await prisma.itemCatalogMapping.deleteMany({
        where: { externalItemCode: fake.externalItemCode }
      });
      await prisma.catalogSearchCandidate.delete({
        where: { id: fake.id }
      });
    }

    await prisma.acquisitionInstrument.deleteMany({
      where: { sourceSystem: "MCL_SIMULADO" }
    });
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}
