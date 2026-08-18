"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  ClipboardList,
  FileInput,
  Gauge,
  History,
  Home,
  Landmark,
  Menu,
  QrCode,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { TechnicalFooter } from "@/components/TechnicalFooter";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";

const navigation = [
  {
    label: "Visão geral",
    items: [
      { href: "/inicio", label: "Início", icon: Home },
      { href: "/painel", label: "Situação geral", icon: Gauge },
      { href: "/assistente", label: "Assistente IA", icon: Bot },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { href: "/necessidades", label: "Necessidades", icon: ClipboardList },
      { href: "/analises/materiais", label: "CATMAT e Atas", icon: Search },
      { href: "/aquisicoes", label: "Aquisições", icon: Landmark },
      { href: "/creditos", label: "Créditos", icon: Wallet },
    ],
  },
  {
    label: "Execução",
    items: [
      { href: "/scanner", label: "Scanner", icon: QrCode },
      { href: "/importacao", label: "Importação", icon: FileInput },
    ],
  },
  {
    label: "Governança",
    items: [
      { href: "/conectores", label: "Conectores", icon: Activity },
      { href: "/divergencias", label: "Divergências", icon: AlertTriangle },
      { href: "/auditoria", label: "Auditoria", icon: History },
    ],
  },
] as const;

const routeNames: Array<[string, string]> = [
  ["/necessidades/", "Dossiê da necessidade"],
  ["/unidades/", "Passaporte logístico"],
  ["/etiquetas/", "Etiqueta logística"],
  ["/catalogo", "CATMAT e Atas"],
  ["/admin/usuarios", "Gestão de usuários"],
  ["/painel", "Situação geral"],
  ["/assistente", "Assistente IA"],
  ["/necessidades", "Necessidades"],
  ["/analises/materiais", "CATMAT e Atas"],
  ["/aquisicoes", "Aquisições"],
  ["/creditos", "Gestão de créditos"],
  ["/scanner", "Scanner"],
  ["/importacao", "Importação"],
  ["/conectores", "Conectores"],
  ["/divergencias", "Divergências"],
  ["/auditoria", "Auditoria"],
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/inicio") return pathname === href;
  if (href === "/analises/materiais") {
    return pathname.startsWith(href) || pathname.startsWith("/catalogo");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/painel";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentTitle = routeNames.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "MCL";

  return (
    <div className="mcl-app-shell">

      <aside className={`mcl-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="mcl-sidebar-head">
          <Link href="/inicio" className="mcl-sidebar-brand" onClick={() => setMobileMenuOpen(false)}>
            <BrandLogo tone="light" className="h-10 w-10 shrink-0" priority sizes="40px" />
            <span>
              <strong>MCL</strong>
              <small>CONTINUIDADE LOGÍSTICA</small>
            </span>
          </Link>
          <button type="button" className="mcl-mobile-close" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)}>
            <X aria-hidden />
          </button>
        </div>

        <nav aria-label="Navegação do sistema" className="mcl-sidebar-nav">
          {navigation.map((group) => (
            <section key={group.label}>
              <span>{group.label}</span>
              {group.items.map((item) => {
                const active = isRouteActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "active" : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon aria-hidden />
                    <b>{item.label}</b>
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="mcl-sidebar-status">
          <i />
          <span>
            <strong>Ambiente demonstrativo</strong>
            <small>Dados sintéticos controlados</small>
          </span>
        </div>
      </aside>

      {mobileMenuOpen ? <button className="mcl-sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} /> : null}

      <div className="mcl-shell-main">
        <header className="mcl-topbar">
          <div className="mcl-topbar-left">
            <button type="button" className="mcl-mobile-menu" aria-label="Abrir menu" onClick={() => setMobileMenuOpen(true)}>
              <Menu aria-hidden />
            </button>
            <div className="mcl-breadcrumb">
              <span>MCL</span>
              <i>/</i>
              <strong>{currentTitle}</strong>
            </div>
          </div>
          <div className="mcl-topbar-actions">
            <button type="button" className="mcl-icon-button" aria-label="Pesquisar">
              <Search aria-hidden />
            </button>
            <button type="button" className="mcl-icon-button mcl-alert-button" aria-label="Notificações">
              <AlertTriangle aria-hidden />
              <i />
            </button>
            <span className="mcl-topbar-divider" />
            <UserSettingsMenu />
          </div>
        </header>

        <main className={`mcl-page ${pathname.startsWith("/assistente") ? "mcl-page-assistant" : ""} ${pathname.startsWith("/creditos") ? "mcl-page-credits" : ""}`}>
          {children}
        </main>

        <TechnicalFooter />
      </div>
    </div>
  );
}
