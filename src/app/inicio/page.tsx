import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, CreditCard, ShoppingCart, PackageCheck, Warehouse, Truck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageTransition } from "@/components/PageTransition";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
import { SystemStatusIndicator } from "@/components/SystemStatusIndicator";
import { getUserProfile } from "@/app/actions/onboarding";
import { getDemoState } from "@/server/demo-store";
import { getDiagnosticData, type SourceSystemDomain, type SourceSystemCatalogEntry } from "@/modules/connectors/catalog";

const metaNav = [
  { 
    href: "/necessidades", label: "Necessidade", icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-400/10", border: "group-hover:border-blue-500/50", shadow: "group-hover:shadow-blue-500/20",
    domain: "Necessidades" as SourceSystemDomain,
    submenus: [ { label: "Registrar Demanda", href: "/necessidades" }, { label: "CATMAT e Atas", href: "/analises/materiais" } ]
  },
  { 
    href: "/painel", label: "Crédito", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "group-hover:border-emerald-500/50", shadow: "group-hover:shadow-emerald-500/20",
    domain: "Orçamento e finanças" as SourceSystemDomain,
    submenus: [ { label: "Painel Geral", href: "/painel" }, { label: "Execução Orçamentária", href: "/painel" } ]
  },
  { 
    href: "/aquisicoes", label: "Aquisição", icon: ShoppingCart, color: "text-amber-400", bg: "bg-amber-400/10", border: "group-hover:border-amber-500/50", shadow: "group-hover:shadow-amber-500/20",
    domain: "Aquisições" as SourceSystemDomain,
    submenus: [ { label: "Instrumentos", href: "/aquisicoes" }, { label: "Conectores", href: "/conectores" } ]
  },
  { 
    href: "/scanner", label: "Recebimento", icon: PackageCheck, color: "text-violet-400", bg: "bg-violet-400/10", border: "group-hover:border-violet-500/50", shadow: "group-hover:shadow-violet-500/20",
    domain: "Recebimento" as SourceSystemDomain,
    submenus: [ { label: "Scanner de Notas", href: "/scanner" }, { label: "Divergências", href: "/divergencias" }, { label: "Importação XML", href: "/importacao" } ]
  },
  { 
    href: "/painel", label: "Armazenagem", icon: Warehouse, color: "text-rose-400", bg: "bg-rose-400/10", border: "group-hover:border-rose-500/50", shadow: "group-hover:shadow-rose-500/20",
    domain: "Estoque / armazém" as SourceSystemDomain,
    submenus: [ { label: "Controle de Estoque", href: "/painel" }, { label: "Auditoria", href: "/auditoria" } ]
  },
  { 
    href: "/painel", label: "Entrega", icon: Truck, color: "text-sky-400", bg: "bg-sky-400/10", border: "group-hover:border-sky-500/50", shadow: "group-hover:shadow-sky-500/20",
    domain: "Transporte / distribuição" as SourceSystemDomain,
    submenus: [ { label: "Roteirização", href: "/painel" }, { label: "Expedição", href: "/painel" } ]
  },
];

function getDomainSummary(domainSystems: SourceSystemCatalogEntry[]) {
  if (domainSystems.length === 0) {
    return { label: "Lacuna", color: "text-zinc-400 border-zinc-700/50 bg-zinc-900/50" };
  }

  // Se qualquer fonte real tiver status FALHA
  const realSystems = domainSystems.filter(sys => sys.nature !== "SINTETICA_DEMONSTRATIVA" && sys.nature !== "DESCONHECIDA_A_MAPEAR");
  const hasRealFailure = realSystems.some(sys => sys.status === "FALHA");
  if (hasRealFailure) {
    return { label: "Falha", color: "text-rose-400 border-rose-500/40 bg-rose-500/15" };
  }

  // Se houver qualquer falha mesmo em simuladores
  const hasAnyFailure = domainSystems.some(sys => sys.status === "FALHA");
  if (hasAnyFailure) {
    return { label: "Falha", color: "text-rose-400 border-rose-500/40 bg-rose-500/15" };
  }

  // Se houver fonte real ativa (SAUDAVEL) e integrada (REAL/PARCIAL)
  const activeReal = realSystems.filter(sys => sys.status === "SAUDAVEL" && (sys.maturity === "INTEGRADO_REAL" || sys.maturity === "INTEGRADO_PARCIAL"));
  if (activeReal.length > 0) {
    const isPartial = activeReal.some(sys => sys.maturity === "INTEGRADO_PARCIAL");
    if (isPartial) {
      return { label: "Parcial", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
    }
    return { label: "Conectado", color: "text-emerald-450 border-emerald-500/40 bg-emerald-500/15" };
  }

  // Se houver fontes mapeadas mas pendentes/não integradas
  const hasRealMapeado = realSystems.some(sys => 
    sys.status === "NAO_INTEGRADO" || 
    sys.status === "PENDENTE" || 
    sys.status === "NAO_CONFIGURADO" || 
    sys.status === "ATRASADO" ||
    sys.maturity === "PLANEJADO" ||
    sys.maturity === "MAPEADO_NAO_INTEGRADO"
  );

  if (hasRealMapeado) {
    return { label: "Pendente", color: "text-zinc-400 border-zinc-800 bg-zinc-900/30" };
  }

  // Se todas as fontes forem simuladores
  const allDemo = domainSystems.every(sys => sys.nature === "SINTETICA_DEMONSTRATIVA" || sys.nature === "MANUAL_VALIDADA");
  if (allDemo) {
    return { label: "Demo", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" };
  }

  // Se houver lacunas
  const hasGap = domainSystems.some(sys => sys.nature === "DESCONHECIDA_A_MAPEAR" || sys.maturity === "DESCONHECIDO");
  if (hasGap) {
    return { label: "Lacuna", color: "text-zinc-450 border-zinc-700/50 bg-zinc-900/50" };
  }

  return { label: "Pendente", color: "text-zinc-400 border-zinc-800 bg-zinc-900/30" };
}

export default async function InicioPage() {
  const profile = await getUserProfile();
  
  if (profile && !profile.termsAcceptedAt) {
    redirect("/primeiro-acesso");
  }

  const state = getDemoState();
  const diagnosis = getDiagnosticData(state);

  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white overflow-hidden">
        
        {/* Floating User Menu */}
        <div className="absolute top-6 right-6 z-50">
          <UserSettingsMenu />
        </div>

        {/* Background Image Container with Blur */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div 
            className="absolute inset-[-20px] bg-cover bg-center bg-no-repeat blur-sm" 
            style={{ backgroundImage: 'url(/bg.png)' }} 
          />
          {/* Dark overlay to ensure contrast */}
          <div className="absolute inset-0 bg-zinc-950/70" />
        </div>

        <main className="relative z-10 mx-auto flex h-screen w-full max-w-7xl flex-col items-center justify-center px-5 sm:px-8 py-10">
          
          <div className="flex flex-col items-center text-center mb-16">
            <BrandLogo
              tone="light"
              priority
              className="h-28 w-28 sm:h-36 sm:w-36 drop-shadow-[0_10px_25px_rgba(255,255,255,0.1)] mb-8"
            />
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              MCL
            </h1>
            <p className="mt-4 text-lg text-zinc-300 max-w-2xl drop-shadow-md">
              Acompanhe necessidade, aquisição, crédito, estoque, remessa e entrega em uma única cadeia informacional contínua.
            </p>
          </div>

          <div className="w-full min-h-[580px] md:min-h-[420px] xl:min-h-[280px] flex justify-center items-start">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 w-full items-start">
            {metaNav.map((item, i) => {
              const domainSystems = diagnosis.systems.filter((sys) => sys.domain === item.domain);
              const summary = getDomainSummary(domainSystems);

              return (
                <div key={i} className="group relative w-full">
                  <div className={`relative flex flex-col items-center p-5 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 hover:bg-zinc-800/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-4 ${item.border} ${item.shadow}`}>
                    
                    {/* Status Badge in corner */}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wider ${summary.color}`}>
                        {summary.label.toUpperCase()}
                      </span>
                    </div>

                    <Link href={item.href} className="flex flex-col items-center w-full">
                      <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center mb-4 ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                        <item.icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </Link>

                    {/* Real system status indicator badges */}
                    <SystemStatusIndicator systems={domainSystems} />

                    <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-300 w-full">
                      <div className="overflow-hidden w-full flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        <div className="h-px w-full bg-zinc-700/50 my-4" />
                        <div className="flex flex-col w-full gap-1.5">
                          {item.submenus.map((sub, j) => (
                            <Link 
                              key={j} 
                              href={sub.href}
                              className="text-xs text-center text-zinc-400 hover:text-white transition-colors py-1.5 px-2 hover:bg-zinc-700/40 rounded-md truncate"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          <div className="mt-16">
            <Link
              href="/painel"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 font-semibold text-white transition hover:bg-emerald-500 shadow-lg hover:shadow-emerald-600/30"
            >
              Acessar Situação Geral
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
          </div>
          
        </main>
      </div>
    </PageTransition>
  );
}
