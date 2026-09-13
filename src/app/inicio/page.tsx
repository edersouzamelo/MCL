import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { AppShellClient } from "@/components/AppShellClient";
import { ChainMetricPopover } from "@/components/ChainMetricPopover";
import { LogisticsStageGlyph } from "@/components/LogisticsStageGlyph";
import { UserSettingsMenu } from "@/components/UserSettingsMenu";
import { getUserProfile } from "@/app/actions/onboarding";
import { getDemoState } from "@/server/demo-store";
import { getDiagnosticData, type SourceSystemCatalogEntry } from "@/modules/connectors/catalog";
import { LOGISTICS_STAGES } from "@/modules/logistics/stages";
import { COMPLEMENTARY_MODULES, SUPPLEMENTARY_MODULES } from "@/modules/system/module-registry";

function getStageStatus(systems: SourceSystemCatalogEntry[]) {
  const relevant = systems.filter((system) => system.sourceKind !== "DEMO_SIMULATOR");
  if (relevant.some((system) => system.status === "FALHA")) return "Falha";
  if (relevant.some((system) => system.status === "SAUDAVEL" && system.maturity === "INTEGRADO_REAL")) return "Conectado";
  if (systems.some((system) => system.status === "SAUDAVEL" && system.maturity === "INTEGRADO_PARCIAL")) return "Parcial";
  if (systems.some((system) => system.status === "SAUDAVEL" && (system.sourceKind === "MCL_NATIVE_CAPABILITY" || system.sourceKind === "DEMO_SIMULATOR"))) return "Demo";
  if (systems.some((system) => system.status === "PENDENTE" || system.status === "NAO_CONFIGURADO" || system.status === "NAO_INTEGRADO")) return "Pendente";
  return "Lacuna / pendente";
}

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-5 5 5-5 5" /></svg>;
}

export default async function InicioPage() {
  const profile = await getUserProfile();
  if (profile && !profile.termsAcceptedAt) redirect("/primeiro-acesso");

  const diagnosis = getDiagnosticData(getDemoState());
  const resolvedStages = LOGISTICS_STAGES.map((stage) => ({
    ...stage,
    status: getStageStatus(diagnosis.systems.filter((system) => system.domain === stage.domain)),
  }));
  const functionalStageItems = resolvedStages.filter((stage) => ["Conectado", "Parcial", "Demo"].includes(stage.status));
  const pendingStageItems = resolvedStages.filter((stage) => !["Conectado", "Parcial", "Demo"].includes(stage.status));
  const functionalStages = functionalStageItems.length;

  return (
    <AppShellClient variant="home">
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
                <ChainMetricPopover label="etapas mapeadas" items={LOGISTICS_STAGES.map((stage) => stage.title)} />
                <ChainMetricPopover label="capacidades funcionais" items={functionalStageItems.map((stage) => stage.title)} />
                <ChainMetricPopover label="fontes catalogadas" items={diagnosis.systems.map((system) => system.name)} />
                <ChainMetricPopover label="pontos pendentes" items={pendingStageItems.map((stage) => stage.title)} tone="attention" />
              </div>
              <div className="ops-progress"><span style={{ width: `${Math.round((functionalStages / LOGISTICS_STAGES.length) * 100)}%` }} /></div>
              <p>{functionalStages} de {LOGISTICS_STAGES.length} etapas possuem alguma capacidade funcional no ambiente atual.</p>
            </div>
          </section>

          <section className="ops-journey" aria-labelledby="journey-title">
            <div className="ops-section-head">
              <div><span className="ops-section-code">CADEIA 01 — 08</span><h2 id="journey-title">Cadeia informacional</h2></div>
              <div className="ops-legend"><span><i className="active" /> Capacidade ativa</span><span><i /> Pendente</span></div>
            </div>

            <div className="ops-stages">
              {resolvedStages.map((stage, index) => (
                <article className={`ops-stage ${stage.tone}`} key={stage.number}>
                  <div className="ops-stage-line" aria-hidden="true"><span>{stage.number}</span>{index < resolvedStages.length - 1 ? <i /> : null}</div>
                  <div className="ops-stage-title">
                    <span className="ops-stage-icon"><LogisticsStageGlyph type={stage.glyph} /></span>
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
              <div><small>Ponto de atenção</small><strong>As etapas mapeadas possuem níveis distintos de integração e homologação.</strong></div>
              <Link href="/conectores">Revisar conectores <Arrow /></Link>
            </div>
            <div className="ops-actions-card">
              <div className="ops-shortcuts"><Link href="/assistente">Assistente IA</Link><Link href="/auditoria">Auditoria</Link><Link href="/conectores">Conectores</Link></div>
              <Link className="ops-primary-action" href="/painel">Abrir situação geral <Arrow /></Link>
            </div>
          </section>

          <section className="ops-support-layers" aria-label="Módulos de apoio do MCL">
            <div className="ops-layer ops-layer-complementary">
              <div className="ops-layer-heading">
                <div><span>NÍVEL 02</span><h2>Módulos complementares</h2></div>
                <p>Sustentam transversalmente as oito etapas.</p>
              </div>
              <div className="ops-module-grid">
                {COMPLEMENTARY_MODULES.map((module) => (
                  <Link className="ops-module-link" href={module.href} key={module.id}>
                    <span><strong>{module.shortTitle}</strong><small>{module.description}</small></span>
                    <i>{module.maturity}</i>
                  </Link>
                ))}
              </div>
            </div>

            <div className="ops-layer ops-layer-supplementary">
              <div className="ops-layer-heading">
                <div><span>NÍVEL 03</span><h2>Módulos suplementares</h2></div>
                <p>Ampliam o núcleo, sem condicioná-lo.</p>
              </div>
              <div className="ops-module-grid">
                {SUPPLEMENTARY_MODULES.map((module) => (
                  <Link className="ops-module-link" href={module.href} key={module.id}>
                    <span><strong>{module.shortTitle}</strong><small>{module.description}</small></span>
                    <i>{module.maturity}</i>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShellClient>
  );
}
