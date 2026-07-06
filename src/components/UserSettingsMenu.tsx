"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Settings2, LogOut, Check, Maximize, User } from "lucide-react";
import { useSettings, Language, FontSize } from "@/contexts/SettingsContext";

export function UserSettingsMenu() {
  const { data: session } = useSession();
  const { 
    language, setLanguage, 
    theme, setTheme, 
    animationsEnabled, setAnimationsEnabled,
    fontSize, setFontSize 
  } = useSettings();
  
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const t = {
    settings: language === "en" ? "SETTINGS" : language === "es" ? "CONFIGURACIONES" : "CONFIGURAÇÕES",
    language: language === "en" ? "LANGUAGE" : language === "es" ? "IDIOMA" : "IDIOMA",
    theme: language === "en" ? "THEME" : language === "es" ? "TEMA" : "TEMA",
    light: language === "en" ? "LIGHT" : language === "es" ? "CLARO" : "CLARO",
    dark: language === "en" ? "DARK" : language === "es" ? "ESCURO" : "ESCURO",
    animations: language === "en" ? "ANIMATIONS" : language === "es" ? "ANIMACIONES" : "ANIMAÇÕES",
    view: language === "en" ? "VIEW SIZE" : language === "es" ? "VISUALIZACIÓN" : "VISUALIZAÇÃO",
    small: language === "en" ? "Small" : language === "es" ? "Pequeña" : "Pequena",
    medium: language === "en" ? "Medium" : language === "es" ? "Media" : "Média",
    large: language === "en" ? "Large" : language === "es" ? "Grande" : "Grande",
    logout: language === "en" ? "LOGOUT" : language === "es" ? "SALIR" : "SAIR DO SISTEMA",
  };

  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 hover:border-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {session?.user?.image && !imageError ? (
            <img 
              src={session.user.image} 
              alt="User avatar" 
              className="h-full w-full object-cover" 
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-full w-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <User className="h-5 w-5" />
            </div>
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-xl bg-zinc-900 shadow-2xl border border-zinc-800 text-zinc-300 z-50 overflow-hidden transform origin-top-right transition-all animate-menu-in">
          
          <div className="p-5 border-b border-zinc-800/80">
            <h3 className="font-semibold text-white truncate">{session?.user?.name || "Usuário"}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">{session?.user?.email || ""}</p>
          </div>

          <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            
            {/* Idioma */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block mb-3">{t.language}</label>
              <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-1">
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full bg-transparent text-sm font-medium text-white px-3 py-2 outline-none cursor-pointer appearance-none"
                >
                  <option value="pt-BR" className="bg-zinc-950 text-white">BR Português (BR)</option>
                  <option value="en" className="bg-zinc-950 text-white">EN English</option>
                  <option value="es" className="bg-zinc-950 text-white">ES Español</option>
                </select>
              </div>
            </div>

            {/* Temas */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block mb-3">{t.theme}</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTheme("light")}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-md border transition-all ${theme === "light" ? "bg-zinc-800 border-emerald-650 text-emerald-400" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                >
                  {t.light}
                </button>
                <button 
                  onClick={() => setTheme("dark")}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-md border transition-all ${theme === "dark" ? "bg-zinc-800 border-emerald-650 text-emerald-400" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                >
                  {t.dark}
                </button>
              </div>
            </div>

            {/* Animações */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block mb-3">{t.animations}</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setAnimationsEnabled(false)}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-md border transition-all ${!animationsEnabled ? "bg-zinc-800 border-emerald-650 text-emerald-400" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                >
                  OFF
                </button>
                <button 
                  onClick={() => setAnimationsEnabled(true)}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-md border transition-all ${animationsEnabled ? "bg-zinc-800 border-emerald-650 text-emerald-400" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                >
                  ON
                </button>
              </div>
            </div>

            {/* Visualização */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block mb-3">{t.view}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["pequena", "media", "grande"] as FontSize[]).map((size) => (
                  <button 
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-2 py-2.5 text-[11px] font-semibold rounded-md border transition-all ${fontSize === size ? "bg-zinc-800 border-emerald-650 text-emerald-400" : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
                  >
                    {t[size === "pequena" ? "small" : size === "media" ? "medium" : "large"]}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="p-2 border-t border-zinc-800">
            {session?.user?.email === "edersouzamelo@gmail.com" && (
              <a 
                href="/admin/usuarios"
                className="w-full flex items-center gap-2 px-3 py-3 text-xs font-bold text-emerald-500 hover:bg-zinc-800/50 rounded-lg transition-colors uppercase tracking-widest mb-1"
              >
                <Settings2 className="h-4 w-4" />
                PAINEL DO ADMINISTRADOR
              </a>
            )}
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-2 px-3 py-3 text-xs font-bold text-red-500 hover:bg-zinc-800/50 rounded-lg transition-colors uppercase tracking-widest"
            >
              <LogOut className="h-4 w-4" />
              {t.logout}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
