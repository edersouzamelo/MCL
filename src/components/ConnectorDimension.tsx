"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { LogisticsStageGlyph } from "@/components/LogisticsStageGlyph";
import type { LogisticsStageDefinition } from "@/modules/logistics/stages";

interface ConnectorDimensionProps {
  stage: Pick<LogisticsStageDefinition, "number" | "title" | "tone" | "glyph">;
  systemCount: number;
  children: ReactNode;
}

export function ConnectorDimension({ stage, systemCount, children }: ConnectorDimensionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const contentId = useId();
  return (
    <section className={`connector-dimension ${stage.tone}`}>
      <button type="button" className="connector-dimension-trigger" aria-expanded={isOpen} aria-controls={contentId} onClick={() => setIsOpen((current) => !current)}>
        <span className="connector-dimension-icon"><LogisticsStageGlyph type={stage.glyph} className="connector-dimension-glyph" /></span>
        <span className="connector-dimension-heading"><span className="connector-dimension-number">DIMENSÃO {stage.number}</span><strong>{stage.title}</strong></span>
        <span className="connector-dimension-count">{systemCount} {systemCount === 1 ? "sistema" : "sistemas"}</span>
        <ChevronDown className="connector-dimension-chevron" aria-hidden />
      </button>
      <div id={contentId} className="connector-dimension-collapse" data-open={isOpen}>
        <div className="connector-dimension-content">{children}</div>
      </div>
    </section>
  );
}
