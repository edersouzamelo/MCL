"use client";

import { useId, useState, useRef, useLayoutEffect, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { ccoScreenDescription, type CcoScreenId } from "@/modules/grupamento/monitor";

export function SagScreenSelection({ screen, selected, onToggle }: {
  screen: { id: CcoScreenId; label: string };
  selected: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const description = ccoScreenDescription(screen.id);
  const tooltip = useRef<HTMLDivElement>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (position && tooltip.current && !tooltip.current.matches(":popover-open")) tooltip.current.showPopover();
  }, [position]);
  useEffect(() => {
    if (!position) return;
    const hide = () => setPosition(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    portalHost?.addEventListener("close", hide);
    return () => { window.removeEventListener("scroll", hide, true); window.removeEventListener("resize", hide); portalHost?.removeEventListener("close", hide); };
  }, [position, portalHost]);
  function show(element: HTMLButtonElement) {
    setPortalHost(element.closest("dialog") ?? document.body);
    const rect = element.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    const above = rect.bottom + 140 > window.innerHeight;
    setPosition({
      position: "fixed", width, margin: 0, inset: "auto",
      left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
      ...(above ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      zIndex: 1000,
    });
  }
  return <>
    <button type="button" onClick={onToggle} aria-pressed={selected} aria-describedby={id}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPosition(null)}
      onKeyDown={(event) => { if (event.key === "Escape" && position) { setPosition(null); event.stopPropagation(); event.preventDefault(); } }}
      className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition ${selected ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-300" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"}`}>
      {selected ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}{screen.label}
    </button>
    {!position && <span id={id} className="sr-only">{description}</span>}
    {position && portalHost && createPortal(
      <div ref={tooltip} popover="manual" id={id} role="tooltip" style={position} className="pointer-events-none rounded-xl border border-sky-300 bg-white p-3 text-xs leading-5 text-slate-800 shadow-xl dark:border-sky-800 dark:bg-slate-900 dark:text-slate-100">
        <strong className="mb-1 block">{screen.label}</strong>{description}
      </div>, portalHost)}
  </>;
}
