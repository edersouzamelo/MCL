import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";
import { PageTransition } from "@/components/PageTransition";

export const metadata = {
  title: "Acesso ao sistema — MCL",
  description: "Autenticação do ambiente demonstrativo do Modelo de Continuidade Logística.",
};

export default function LoginPage() {
  return (
    <PageTransition>
      <div className="auth-shell">
        <div className="auth-background" aria-hidden="true" />
        <div className="auth-grid" aria-hidden="true" />

        <header className="auth-topbar">
          <Link href="/" className="auth-brand" aria-label="MCL — voltar à capa">
            <strong>MCL</strong>
            <span>Modelo de Continuidade Logística</span>
          </Link>
          <div className="auth-environment">
            <span><i /> Ambiente demonstrativo</span>
            <b>V0.9</b>
          </div>
        </header>

        <main className="auth-layout">
          <section className="auth-visual" aria-label="Modelo de Continuidade Logística">
            <div className="auth-logo-wrap">
              <BrandLogo tone="light" className="auth-main-logo" priority sizes="(max-width: 900px) 46vw, 520px" />
              <span className="auth-side-code">AUTH — 01</span>
            </div>

            <div className="auth-visual-copy">
              <span>MCL / CONTINUIDADE LOGÍSTICA</span>
              <h2>Informação preservada. <em>Acesso controlado.</em></h2>
              <p>Um único ambiente para acompanhar a cadeia logística com contexto, rastreabilidade e origem.</p>
            </div>
          </section>

          <section className="auth-access">
            <div className="auth-panel">
              <Link href="/" className="auth-back-link">
                <ArrowLeft aria-hidden />
                Voltar para a capa
              </Link>

              <header className="auth-panel-header">
                <div className="auth-kicker"><span>MCL AUTH</span><i /></div>
                <h1>Acesso ao sistema</h1>
                <p>Autenticação do ambiente demonstrativo. Os perfis limitam funções de operação e preservam a origem das ações.</p>
              </header>

              <LoginForm />

              <footer className="auth-panel-footer">
                <i />
                <span><strong>Ambiente demonstrativo</strong> — sem vínculo com a identidade corporativa do Exército Brasileiro.</span>
              </footer>
            </div>
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
