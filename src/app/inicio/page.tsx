import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
import { getUserProfile } from "@/app/actions/onboarding";
import { getDemoState } from "@/server/demo-store";
import { getDiagnosticData, type SourceSystemCatalogEntry, type SourceSystemDomain } from "@/modules/connectors/catalog";

const stages = [
  { number: "01", title: "Necessidade", tone: "blue", description: "Demandas, catálogo oficial e atas disponíveis para análise.", meta: "2 acessos operacionais", glyph: "clipboard", href: "/necessidades", domain: "Necessidades" as SourceSystemDomain },
  { number: "02", title: "Crédito", tone: "mint", description: "Gestão orçamentária e conexão com as fontes financeiras.", meta: "Cockpit financeiro", glyph: "credit", href: "/creditos", domain: "Orçamento e finanças" as SourceSystemDomain },
  { number: "03", title: "Aquisição", tone: "amber", description: "Instrumentos públicos e conectores de aquisição correlacionados.", meta: "Fonte pública ativa", glyph: "cart", href: "/aquisicoes", domain: "Aquisições" as SourceSystemDomain },
  { number: "04", title: "Recebimento", tone: "violet", description: "Notas, divergências e importações vinculadas ao recebimento.", meta: "3 acessos operacionais", glyph: "package", href: "/scanner", domain: "Recebimento" as SourceSystemDomain },
  { number: "05", title: "Armazenagem", tone: "rose", description: "Estoque, endereçamento e auditoria da unidade logística.", meta: "Integração a concluir", glyph: "warehouse", href: "/painel", domain: "Estoque / armazém" as SourceSystemDomain },
  { number: "06", title: "Entrega", tone: "cyan", description: "Expedição, transporte e confirmação da entrega final.", meta: "Fonte a mapear", glyph: "truck", href: "/conectores?dominio=transporte", domain: "Transporte / distribuição" as SourceSystemDomain },
];

function getStageStatus(systems: SourceSystemCatalogEntry[]) {
  const relevant = systems.filter((system) => system.sourceKind !== "DEMO_SIMULATOR");
  if (relevant.some((system) => system.status === "FALHA")) return "Falha";
  if (relevant.some((system) => system.status === "SAUDAVEL" && system.maturity === "INTEGRADO_REAL")) return "Conectado";
  if (systems.some((system) => system.status === "SAUDAVEL" && system.maturity === "INTEGRADO_PARCIAL")) return "Parcial";
  if (systems.some((system) => system.status === "SAUDAVEL" && (system.sourceKind === "MCL_NATIVE_CAPABILITY" || system.sourceKind === "DEMO_SIMULATOR"))) return "Demo";
  if (systems.some((system) => system.status === "PENDENTE" || system.status === "NAO_CONFIGURADO" || system.status === "NAO_INTEGRADO")) return "Pendente";
  return "Lacuna / pendente";
}

function StageGlyph({ type }: { type: string }) {
  const paths: Record<string, ReactNode> = {
    clipboard: <><path d="M10 7H7v21h18V7h-3" /><path d="M11 4h10v6H11zM11 16l3 3 6-7M11 24h10" /></>,
    credit: <><path d="M5 8h22v17H5zM5 13h22M9 20h6" /><path d="M22 18v4" /></>,
    cart: <><path d="M4 6h4l3 14h12l3-10H10M12 25h3v3h-3zM21 25h3v3h-3z" /><path d="M13 15h10" /></>,
    package: <><path d="M5 10l11-6 11 6v13l-11 6-11-6zM5 10l11 6 11-6M16 16v13" /><path d="M10 7l11 6v5" /></>,
    warehouse: <><path d="M4 13L16 5l12 8v15H4zM8 16h16M9 20h6v8M18 20h6v8" /><path d="M13 11h6" /></>,
    truck: <><path d="M3 8h15v15H3zM18 13h6l5 6v4H18zM8 23v4h4v-4M22 23v4h4v-4" /><path d="M24 14v5h5" /></>,
  };
  return (
    <svg className="ops-stage-icon-symbol" viewBox="0 0 32 32" aria-hidden="true">
      {paths[type] ?? paths.package}
    </svg>
  );
}

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-5 5 5-5 5" /></svg>;
}

export default async function InicioPage() {
  const profile = await getUserProfile();
  if (profile && !profile.termsAcceptedAt) redirect("/primeiro-acesso");

  const diagnosis = getDiagnosticData(getDemoState());
  const resolvedStages = stages.map((stage) => ({
    ...stage,
    status: getStageStatus(diagnosis.systems.filter((system) => system.domain === stage.domain)),
  }));
  const functionalStages = resolvedStages.filter((stage) => ["Conectado", "Parcial", "Demo"].includes(stage.status)).length;
  const pendingStages = resolvedStages.length - functionalStages;

  return (
    <main className="ops-shell">
        <div className="ops-grid-field" />
        <div className="ops-ambient" />

        <header className="ops-topbar">
          <Link className="ops-brand" href="/" aria-label="MCL — página inicial">
            <BrandLogo tone="light" className="h-11 w-10" priority sizes="40px" />
            <span><strong>MCL</strong><small>Modelo de Continuidade Logística</small></span>
          </Link>
          <div className="ops-context">
            <span className="ops-environment"><i /> Ambiente demonstrativo</span>
            <span className="ops-divider" />
            <UserSettingsMenu />
          </div>
        </header>

        <div className="ops-page">
          <section className="ops-intro">
            <div className="ops-intro-copy">
              <div className="ops-eyebrow"><span>Visão operacional</span><i /></div>
              <h1>Continuidade logística<br /><span>em uma única leitura.</span></h1>
              <p>Acompanhe a maturidade das fontes e avance pela cadeia preservando contexto, correlação e origem dos dados.</p>
            </div>

            <div className="ops-overview" aria-label="Resumo da situação da cadeia">
              <div className="ops-overview-head"><span>Situação da cadeia</span><strong><i /> Em implantação</strong></div>
              <div className="ops-metrics">
                <div><strong>06</strong><span>etapas mapeadas</span></div>
                <div><strong>{String(functionalStages).padStart(2, "0")}</strong><span>capacidades funcionais</span></div>
                <div><strong>{String(diagnosis.systems.length).padStart(2, "0")}</strong><span>fontes catalogadas</span></div>
                <div className="attention"><strong>{String(pendingStages).padStart(2, "0")}</strong><span>pontos pendentes</span></div>
              </div>
              <div className="ops-progress"><span style={{ width: `${Math.round((functionalStages / 6) * 100)}%` }} /></div>
              <p>{functionalStages} de 6 etapas possuem alguma capacidade funcional no ambiente atual.</p>
            </div>
          </section>

          <section className="ops-journey" aria-labelledby="journey-title">
            <div className="ops-section-head">
              <div><span className="ops-section-code">CADEIA 01 — 06</span><h2 id="journey-title">Cadeia informacional</h2></div>
              <div className="ops-legend"><span><i className="active" /> Capacidade ativa</span><span><i /> Pendente</span></div>
            </div>

            <div className="ops-stages">
              {resolvedStages.map((stage, index) => (
                <article className={`ops-stage ${stage.tone}`} key={stage.number}>
                  <div className="ops-stage-line" aria-hidden="true"><span>{stage.number}</span>{index < resolvedStages.length - 1 ? <i /> : null}</div>
                  <div className="ops-stage-title">
                    <span className="ops-stage-icon"><StageGlyph type={stage.glyph} /></span>
                    <div><h3>{stage.title}</h3><span className="ops-status">{stage.status}</span></div>
                  </div>
                  <p>{stage.description}</p>
                  <div className="ops-stage-foot"><span>{stage.meta}</span><Link href={stage.href} aria-label={`Abrir ${stage.title}`}><Arrow /></Link></div>
                </article>
              ))}
            </div>
          </section>

          <section className="ops-bottom">
            <div className="ops-attention-card">
              <span className="ops-attention-mark">!</span>
              <div><small>Ponto de atenção</small><strong>Crédito, armazenagem e entrega dependem de integrações ainda pendentes.</strong></div>
              <Link href="/conectores">Revisar conectores <Arrow /></Link>
            </div>
            <div className="ops-actions-card">
              <div className="ops-shortcuts"><Link href="/assistente">Assistente IA</Link><Link href="/auditoria">Auditoria</Link><Link href="/conectores">Conectores</Link></div>
              <Link className="ops-primary-action" href="/painel">Abrir situação geral <Arrow /></Link>
            </div>
          </section>
        </div>
    </main>
  );
}
