"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type Language = "pt-BR" | "en" | "es";
export type FontSize = "pequena" | "media" | "grande";

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  
  // Default values
  const [language, setLanguage] = useState<Language>("pt-BR");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>("media");
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("mcl-lang") as Language;
    if (savedLang) setLanguage(savedLang);
    
    const savedAnim = localStorage.getItem("mcl-anim");
    if (savedAnim !== null) setAnimationsEnabled(savedAnim === "true");
    
    const savedFont = localStorage.getItem("mcl-font") as FontSize;
    if (savedFont) setFontSize(savedFont);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem("mcl-lang", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("mcl-anim", String(animationsEnabled));
  }, [animationsEnabled]);

  useEffect(() => {
    localStorage.setItem("mcl-font", fontSize);
    
    // Apply font size to document html to affect REM sizing globally (Tailwind's base)
    const root = document.documentElement;
    root.classList.remove("text-[14px]", "text-[16px]", "text-[18px]");
    if (fontSize === "pequena") root.classList.add("text-[14px]");
    else if (fontSize === "media") root.classList.add("text-[16px]");
    else if (fontSize === "grande") root.classList.add("text-[18px]");
  }, [fontSize]);

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        animationsEnabled,
        setAnimationsEnabled,
        fontSize,
        setFontSize,
        theme: theme || "light",
        setTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
