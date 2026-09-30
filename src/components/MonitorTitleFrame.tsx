"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { monitorTitleColor, normalizeMonitorTitle } from "@/modules/grupamento/monitor-content/presentation-title";

export function MonitorTitleFrame({ title, light, children, system = false, omitTitle = false }: { title: string; light: boolean; children: ReactNode; system?: boolean; omitTitle?: boolean }) {
  const text = useRef<HTMLHeadingElement>(null);
  const normalized = normalizeMonitorTitle(title);
  useLayoutEffect(() => {
    const node = text.current;
    if (!node) return;
    const fit = () => {
      node.style.fontSize = "";
      let size = parseFloat(getComputedStyle(node).fontSize);
      while ((node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) && size > 10) {
        size -= 1;
        node.style.fontSize = `${size}px`;
      }
    };
    const observer = new ResizeObserver(fit);
    if (node.parentElement) observer.observe(node.parentElement);
    fit();
    void document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [normalized, omitTitle]);
  if (omitTitle) return <div className="h-full w-full" data-integral-image-slide>{children}</div>;
  return <div className="mcl-standard-slide" data-standard-monitor-title data-title-theme={light ? "light" : "dark"}>
    <header className="mcl-standard-title-box" style={{ color: monitorTitleColor(light) }}>
      <h1 ref={text}>{normalized}</h1>
    </header>
    <div className={"mcl-standard-slide-body" + (system ? " mcl-standard-system-body" : "")}>{children}</div>
  </div>;
}
