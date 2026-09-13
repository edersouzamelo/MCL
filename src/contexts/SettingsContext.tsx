"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { saveUserPreferences, loadUserPreferences } from "@/app/actions/preferences";

export type Language = "pt-BR" | "en" | "es";
export type FontSize = "pequena" | "media" | "grande";
export type Theme = "light" | "dark" | "military";

interface SettingsContextData {
  language: Language;
  setLanguage: (lang: Language) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const SettingsContext = createContext<SettingsContextData>({} as SettingsContextData);

function normalizeTheme(theme: string | null | undefined): Theme {
  return theme === "light" || theme === "military" ? theme : "dark";
}

function applyVisualPreferences(theme: Theme, fontSize: FontSize, animationsEnabled: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme !== "light");
  root.dataset.mclTheme = theme;
  root.dataset.mclFont = fontSize;
  root.dataset.mclMotion = animationsEnabled ? "on" : "off";
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const [language, setLanguage] = useState<Language>("pt-BR");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>("media");
  const [theme, setTheme] = useState<Theme>("dark");

  // Load from local storage on mount (fast visual restore)
  useEffect(() => {
    const localLang = (localStorage.getItem("mcl-lang") as Language) || "pt-BR";
    const localAnim = localStorage.getItem("mcl-anim") !== "false"; // Default is true
    const localFont = (localStorage.getItem("mcl-font") as FontSize) || "media";
    const localTheme = normalizeTheme(localStorage.getItem("mcl_theme"));

    setLanguage(localLang);
    setAnimationsEnabled(localAnim);
    setFontSize(localFont);
    setTheme(localTheme);

    applyVisualPreferences(localTheme, localFont, localAnim);
  }, []);

  // Fetch from server DB when user logs in/authenticates
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      loadUserPreferences().then((serverPrefs) => {
        if (serverPrefs) {
          setLanguage(serverPrefs.language as Language);
          setAnimationsEnabled(serverPrefs.animationsEnabled);
          setFontSize(serverPrefs.fontSize as FontSize);
          const serverTheme = normalizeTheme(serverPrefs.theme);
          setTheme(serverTheme);

          localStorage.setItem("mcl-lang", serverPrefs.language);
          localStorage.setItem("mcl-anim", String(serverPrefs.animationsEnabled));
          localStorage.setItem("mcl-font", serverPrefs.fontSize);
          localStorage.setItem("mcl_theme", serverTheme);

          applyVisualPreferences(serverTheme, serverPrefs.fontSize as FontSize, serverPrefs.animationsEnabled);
        }
      });
    }
  }, [status, session?.user?.id]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("mcl-lang", lang);
    if (status === "authenticated") {
      saveUserPreferences({ language: lang, theme, fontSize, animationsEnabled });
    }
  };

  const handleAnimationsChange = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem("mcl-anim", String(enabled));
    applyVisualPreferences(theme, fontSize, enabled);
    if (status === "authenticated") {
      saveUserPreferences({ language, theme, fontSize, animationsEnabled: enabled });
    }
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem("mcl-font", size);
    
    applyVisualPreferences(theme, size, animationsEnabled);

    if (status === "authenticated") {
      saveUserPreferences({ language, theme, fontSize: size, animationsEnabled });
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("mcl_theme", newTheme);
    applyVisualPreferences(newTheme, fontSize, animationsEnabled);

    if (status === "authenticated") {
      saveUserPreferences({ language, theme: newTheme, fontSize, animationsEnabled });
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage: handleLanguageChange,
        animationsEnabled,
        setAnimationsEnabled: handleAnimationsChange,
        fontSize,
        setFontSize: handleFontSizeChange,
        theme,
        setTheme: handleThemeChange,
      }}
    >
      <div className={`font-${fontSize} ${animationsEnabled ? 'transitions-enabled' : 'transitions-disabled'}`}>{children}</div>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
