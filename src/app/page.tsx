"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { HoneycombLogo } from "@/components/HoneycombLogo";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/contexts/SettingsContext";
import styles from "./page.module.css";

const capabilities = [
  { number: "01", title: "Rastreabilidade", text: "Acompanhamento por unidade logística", tone: styles.mint },
  { number: "02", title: "Continuidade", text: "Fluxo físico e informacional correlacionado", tone: "" },
  { number: "03", title: "Visão consolidada", text: "Uma cadeia, da necessidade à entrega", tone: styles.amber },
  { number: "04", title: "Auditabilidade", text: "Origem do dado permanentemente preservada", tone: styles.rose },
];

export default function Home() {
  const { animationsEnabled } = useSettings();

  return (
    <PageTransition>
      <main className={styles.shell}>
        <div className={`${styles.ambient} ${styles.ambientLeft}`} />
        <div className={`${styles.ambient} ${styles.ambientRight}`} />
        <div className={styles.gridField} />

        <header className={styles.topbar}>
          <div className={styles.brand} aria-label="Modelo de Continuidade Logística">
            <span className={styles.brandMonogram}>MCL</span>
            <span className={styles.brandName}>Modelo de Continuidade<br />Logística</span>
          </div>
          <div className={styles.environment}>
            <span className={styles.statusDot} />
            Ambiente demonstrativo
            <span className={styles.version}>v0.9</span>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.symbolStage} aria-label="Identidade visual do MCL">
            <div className={styles.warehouseBackground} />
            <div className={styles.logoCenter}><HoneycombLogo /></div>
            <p className={styles.stageCaption} aria-hidden="true">
              <span>Cadeia informacional</span><span>01 — 06</span>
            </p>
          </div>

          <div className={styles.panelArea}>
            <motion.section
              initial={animationsEnabled ? { opacity: 0, y: 28, scale: 0.985 } : {}}
              animate={animationsEnabled ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={styles.contentPanel}
            >
              <div className={styles.panelHalo} />
              <div className={styles.eyebrow}><span>Plataforma logística</span><span className={styles.eyebrowLine} /></div>
              <h1 className={styles.title}>Da necessidade à entrega,<span> uma única cadeia informacional.</span></h1>
              <p className={styles.lead}>
                Acompanhe aquisição, crédito, estoque, unidade logística, remessa e entrega
                com continuidade, contexto e origem preservados.
              </p>

              <div className={styles.actions}>
                <Link className={styles.primaryAction} href="/entrar">
                  Acessar plataforma
                  <ArrowRight aria-hidden size={19} strokeWidth={1.7} />
                </Link>
                <a className={styles.textAction} href="#capacidades">Conhecer o modelo</a>
              </div>

              <div className={styles.capabilities} id="capacidades">
                {capabilities.map((item) => (
                  <article className={styles.capability} key={item.number}>
                    <span className={`${styles.capabilityIndex} ${item.tone}`}>{item.number}</span>
                    <div><h2>{item.title}</h2><p>{item.text}</p></div>
                  </article>
                ))}
              </div>

              <footer className={styles.panelFooter}>
                <span>Dados sintéticos para demonstração controlada</span>
                <span className={styles.footerCode}>MCL / CMO</span>
              </footer>
            </motion.section>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
