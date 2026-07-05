"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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
  const [language, setLanguage] = useState<Language>("pt-BR");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>("media");
  const [theme, setTheme] = useState<string>("light");
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("mcl-lang") as Language;
    if (savedLang) setLanguage(savedLang);
    
    const savedAnim = localStorage.getItem("mcl-anim");
    if (savedAnim !== null) setAnimationsEnabled(savedAnim === "true");
    
    const savedFont = localStorage.getItem("mcl-font") as FontSize;
    if (savedFont) setFontSize(savedFont);

    const savedTheme = localStorage.getItem("mcl_theme");
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("mcl-lang", lang);
  };

  const handleAnimationsChange = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem("mcl-anim", String(enabled));
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem("mcl-font", size);
    
    // Apply font size to document html to affect REM sizing globally (Tailwind's base)
    const root = document.documentElement;
    root.classList.remove("text-[14px]", "text-[16px]", "text-[18px]");
    if (size === "pequena") root.classList.add("text-[14px]");
    else if (size === "media") root.classList.add("text-[16px]");
    else if (size === "grande") root.classList.add("text-[18px]");
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("mcl_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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
