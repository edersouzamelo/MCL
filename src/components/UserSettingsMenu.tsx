"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings2, SlidersHorizontal, User } from "lucide-react";
import { useSettings, type FontSize, type Language } from "@/contexts/SettingsContext";

export function UserSettingsMenu() {
  const { data: session } = useSession();
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    animationsEnabled,
    setAnimationsEnabled,
    fontSize,
    setFontSize,
  } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const labels = {
    language: language === "en" ? "Language" : language === "es" ? "Idioma" : "Idioma",
    theme: language === "en" ? "Theme" : language === "es" ? "Tema" : "Tema",
    font: language === "en" ? "Text size" : language === "es" ? "Tamaño del texto" : "Tamanho do texto",
    motion: language === "en" ? "Animations" : language === "es" ? "Animaciones" : "Animações",
  };

  return (
    <div className="mcl-user-menu" ref={menuRef}>
      <div className="mcl-user-summary">
        <div>
          <strong>{session?.user?.name || "Operador Demonstrativo"}</strong>
          <small>Cmdo 9º Gpt Log · UASG 160136</small>
        </div>
        <button
          type="button"
          className={`mcl-settings-trigger ${isOpen ? "active" : ""}`}
          aria-label="Abrir configurações"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <Settings2 aria-hidden />
        </button>
        <button
          type="button"
          className="mcl-avatar"
          aria-label="Abrir perfil e configurações"
          onClick={() => setIsOpen((open) => !open)}
        >
          {session?.user?.image && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" referrerPolicy="no-referrer" onError={() => setImageError(true)} />
          ) : (
            <User aria-hidden />
          )}
        </button>
      </div>

      {isOpen ? (
        <div className="mcl-settings-panel" role="dialog" aria-label="Configurações de visualização">
          <header>
            <div>
              <strong>Configurações</strong>
              <span>Preferências desta visualização</span>
            </div>
            <SlidersHorizontal aria-hidden />
          </header>

          <section>
            <label htmlFor="mcl-language">{labels.language}</label>
            <select id="mcl-language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="pt-BR">BR Português (BR)</option>
              <option value="en">EN English</option>
              <option value="es">ES Español</option>
            </select>
          </section>

          <section>
            <span>{labels.theme}</span>
            <div className="mcl-choice-grid two">
              <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>Claro</button>
              <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>Escuro</button>
            </div>
          </section>

          <section>
            <span>{labels.font}</span>
            <div className="mcl-choice-grid three">
              {(["pequena", "media", "grande"] as FontSize[]).map((size) => (
                <button type="button" key={size} className={fontSize === size ? "active" : ""} onClick={() => setFontSize(size)}>
                  {size === "pequena" ? "Pequeno" : size === "media" ? "Médio" : "Grande"}
                </button>
              ))}
            </div>
          </section>

          <section>
            <span>{labels.motion}</span>
            <div className="mcl-choice-grid two">
              <button type="button" className={!animationsEnabled ? "active" : ""} onClick={() => setAnimationsEnabled(false)}>Desativadas</button>
              <button type="button" className={animationsEnabled ? "active" : ""} onClick={() => setAnimationsEnabled(true)}>Ativadas</button>
            </div>
          </section>

          <footer>
            {session?.user?.email === "edersouzamelo@gmail.com" ? (
              <Link href="/admin/usuarios" onClick={() => setIsOpen(false)}>
                <Settings2 aria-hidden />
                Painel do administrador
              </Link>
            ) : null}
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut aria-hidden />
              Sair do sistema
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
