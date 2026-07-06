"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { saveUserPreferences, loadUserPreferences } from "@/app/actions/preferences";

export type Language = "pt-BR" | "en" | "es";
export type FontSize = "pequena" | "media" | "grande";

interface SettingsContextData {
  language: Language;
  setLanguage: (lang: Language) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const SettingsContext = createContext<SettingsContextData>({} as SettingsContextData);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const [language, setLanguage] = useState<Language>("pt-BR");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>("media");
  const [theme, setTheme] = useState<string>("dark");

  // Load from local storage on mount (fast visual restore)
  useEffect(() => {
    const localLang = (localStorage.getItem("mcl-lang") as Language) || "pt-BR";
    const localAnim = localStorage.getItem("mcl-anim") !== "false"; // Default is true
    const localFont = (localStorage.getItem("mcl-font") as FontSize) || "media";
    const localTheme = localStorage.getItem("mcl_theme") || "light";

    setLanguage(localLang);
    setAnimationsEnabled(localAnim);
    setFontSize(localFont);
    setTheme(localTheme);

    // Apply visual classes
    const root = document.documentElement;
    if (localTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.classList.remove("text-[14px]", "text-[16px]", "text-[18px]");
    if (localFont === "pequena") root.classList.add("text-[14px]");
    else if (localFont === "media") root.classList.add("text-[16px]");
    else if (localFont === "grande") root.classList.add("text-[18px]");
  }, []);

  // Fetch from server DB when user logs in/authenticates
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      loadUserPreferences().then((serverPrefs) => {
        if (serverPrefs) {
          setLanguage(serverPrefs.language as Language);
          setAnimationsEnabled(serverPrefs.animationsEnabled);
          setFontSize(serverPrefs.fontSize as FontSize);
          setTheme(serverPrefs.theme);

          localStorage.setItem("mcl-lang", serverPrefs.language);
          localStorage.setItem("mcl-anim", String(serverPrefs.animationsEnabled));
          localStorage.setItem("mcl-font", serverPrefs.fontSize);
          localStorage.setItem("mcl_theme", serverPrefs.theme);

          // Apply visual classes
          const root = document.documentElement;
          if (serverPrefs.theme === "dark") {
            root.classList.add("dark");
          } else {
            root.classList.remove("dark");
          }

          root.classList.remove("text-[14px]", "text-[16px]", "text-[18px]");
          if (serverPrefs.fontSize === "pequena") root.classList.add("text-[14px]");
          else if (serverPrefs.fontSize === "media") root.classList.add("text-[16px]");
          else if (serverPrefs.fontSize === "grande") root.classList.add("text-[18px]");
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
    if (status === "authenticated") {
      saveUserPreferences({ language, theme, fontSize, animationsEnabled: enabled });
    }
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem("mcl-font", size);
    
    // Apply font size class to document
    const root = document.documentElement;
    root.classList.remove("text-[14px]", "text-[16px]", "text-[18px]");
    if (size === "pequena") root.classList.add("text-[14px]");
    else if (size === "media") root.classList.add("text-[16px]");
    else if (size === "grande") root.classList.add("text-[18px]");

    if (status === "authenticated") {
      saveUserPreferences({ language, theme, fontSize: size, animationsEnabled });
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("mcl_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

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
