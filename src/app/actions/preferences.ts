"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/modules/auth/options";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";
import { getDemoState } from "@/server/demo-store";
import { cookies } from "next/headers";

export async function saveUserPreferences(prefs: {
  language: string;
  theme: string;
  fontSize: string;
  animationsEnabled: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Não autenticado" };

  const mode = persistenceMode();
  const data = {
    prefLanguage: prefs.language,
    prefTheme: prefs.theme,
    prefFontSize: prefs.fontSize,
    prefAnimations: prefs.animationsEnabled,
  };

  // 1. Save to DB
  if (mode === "postgresql") {
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data,
      });
    } catch (error) {
      console.error("Erro ao salvar preferências no DB:", error);
    }
  }

  // 2. Save to memory state
  const state = getDemoState();
  const userIndex = state.users.findIndex((u) => u.id === session.user?.id);
  if (userIndex >= 0) {
    state.users[userIndex] = {
      ...state.users[userIndex],
      ...data,
    } as any;
  }

  // 3. Save to cookies for server-side rendering support
  const cookieStore = await cookies();
  cookieStore.set("mcl_pref_language", prefs.language, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  cookieStore.set("mcl_pref_theme", prefs.theme, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  cookieStore.set("mcl_pref_font_size", prefs.fontSize, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  cookieStore.set("mcl_pref_animations", String(prefs.animationsEnabled), { maxAge: 60 * 60 * 24 * 365, path: "/" });

  return { success: true };
}

export async function loadUserPreferences() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const mode = persistenceMode();

  // 1. Try DB
  if (mode === "postgresql") {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
      if (dbUser) {
        return {
          language: dbUser.prefLanguage || "pt-BR",
          theme: dbUser.prefTheme || "dark",
          fontSize: dbUser.prefFontSize || "media",
          animationsEnabled: dbUser.prefAnimations !== null ? dbUser.prefAnimations : true,
        };
      }
    } catch (error) {
      console.error("Erro ao carregar preferências do DB:", error);
    }
  }

  // 2. Try memory
  const state = getDemoState();
  const user = state.users.find((u) => u.id === session.user?.id);
  if (user) {
    return {
      language: (user as any).prefLanguage || "pt-BR",
      theme: (user as any).prefTheme || "dark",
      fontSize: (user as any).prefFontSize || "media",
      animationsEnabled: (user as any).prefAnimations !== undefined ? (user as any).prefAnimations : true,
    };
  }

  // 3. Try cookies
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("mcl_pref_language")?.value;
  const cookieTheme = cookieStore.get("mcl_pref_theme")?.value;
  const cookieFont = cookieStore.get("mcl_pref_font_size")?.value;
  const cookieAnim = cookieStore.get("mcl_pref_animations")?.value;

  if (cookieLang || cookieTheme || cookieFont || cookieAnim) {
    return {
      language: cookieLang || "pt-BR",
      theme: cookieTheme || "dark",
      fontSize: cookieFont || "media",
      animationsEnabled: cookieAnim !== undefined ? cookieAnim === "true" : true,
    };
  }

  return null;
}
