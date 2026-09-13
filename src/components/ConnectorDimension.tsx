"use client";

import { useId, useRef, type MouseEvent, type ReactNode } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { LogisticsStageGlyph } from "@/components/LogisticsStageGlyph";
import type { LogisticsStageDefinition } from "@/modules/logistics/stages";

interface ConnectorDimensionProps {
  stage: Pick<LogisticsStageDefinition, "number" | "title" | "tone" | "glyph">;
  systemCount: number;
  children: ReactNode;
}

export function ConnectorDimension({ stage, systemCount, children }: ConnectorDimensionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog();
  }

  return (
    <section className={`connector-dimension ${stage.tone}`}>
      <button type="button" className="connector-dimension-trigger" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        <span className="connector-dimension-icon"><LogisticsStageGlyph type={stage.glyph} className="connector-dimension-glyph" /></span>
        <span className="connector-dimension-heading"><span className="connector-dimension-number">DIMENSÃO {stage.number}</span><strong>{stage.title}</strong></span>
        <span className="connector-dimension-count">{systemCount} {systemCount === 1 ? "sistema" : "sistemas"}</span>
        <ArrowUpRight className="connector-dimension-arrow" aria-hidden />
      </button>
      <dialog ref={dialogRef} className={`connector-dimension-dialog ${stage.tone}`} aria-labelledby={titleId} onClick={handleBackdropClick}>
        <div className="connector-dimension-dialog-panel">
          <header className="connector-dimension-dialog-header">
            <span className="connector-dimension-icon"><LogisticsStageGlyph type={stage.glyph} className="connector-dimension-glyph" /></span>
            <span className="connector-dimension-heading">
              <span className="connector-dimension-number">DIMENSÃO {stage.number}</span>
              <strong id={titleId}>{stage.title}</strong>
            </span>
            <span className="connector-dimension-dialog-count">{systemCount} {systemCount === 1 ? "sistema catalogado" : "sistemas catalogados"}</span>
            <button type="button" className="connector-dimension-close" onClick={closeDialog} aria-label={`Fechar ${stage.title}`}><X aria-hidden /></button>
          </header>
          <div className="connector-dimension-dialog-content">{children}</div>
        </div>
      </dialog>
    </section>
  );
}
