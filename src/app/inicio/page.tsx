import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { PageTransition } from "@/components/PageTransition";
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
  if (type === "clipboard") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="12" height="16" rx="2" /><path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4" /></svg>;
  if (type === "credit") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>;
  if (type === "cart") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 11h10l3-8H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>;
  if (type === "package") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10M8 5l8 4" /></svg>;
  if (type === "warehouse") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10 12 4l9 6v10H3V10Z" /><path d="M7 20v-7h10v7M7 16h10" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3V6Zm11 4h4l3 4v3h-7v-7Z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></svg>;
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
    <PageTransition>
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
    </PageTransition>
  );
}
