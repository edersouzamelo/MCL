"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ChainMetricPopoverProps {
  label: string;
  items: readonly string[];
  tone?: "default" | "attention";
}

interface PopoverPosition {
  left: number;
  top: number;
  placement: "above" | "below";
}

const POPOVER_GAP = 10;
const VIEWPORT_MARGIN = 12;

export function ChainMetricPopover({ label, items, tone = "default" }: ChainMetricPopoverProps) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const show = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const hide = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(hide, 90);
  }, [cancelClose, hide]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const spaceAbove = triggerRect.top - POPOVER_GAP - VIEWPORT_MARGIN;
    const spaceBelow = window.innerHeight - triggerRect.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
    const placement = spaceAbove >= popoverRect.height || spaceAbove >= spaceBelow ? "above" : "below";
    const preferredLeft = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
    const left = Math.min(
      Math.max(preferredLeft, VIEWPORT_MARGIN),
      window.innerWidth - popoverRect.width - VIEWPORT_MARGIN,
    );
    const preferredTop = placement === "above"
      ? triggerRect.top - popoverRect.height - POPOVER_GAP
      : triggerRect.bottom + POPOVER_GAP;
    const top = Math.min(
      Math.max(preferredTop, VIEWPORT_MARGIN),
      window.innerHeight - popoverRect.height - VIEWPORT_MARGIN,
    );

    setPosition({ left, top, placement });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const animationFrame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideInteraction = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) hide();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        triggerRef.current?.focus();
        hide();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [hide, open, updatePosition]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const formattedTotal = String(items.length).padStart(2, "0");
  const popover = open ? createPortal(
    <div
      className={`ops-metric-popover${position ? " is-positioned" : ""}`}
      data-placement={position?.placement ?? "above"}
      id={popoverId}
      ref={popoverRef}
      role="tooltip"
      style={position ? { left: position.left, top: position.top } : undefined}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div className="ops-metric-popover-title">{label}</div>
      <ol>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ol>
    </div>,
    document.body,
  ) : null;

  return (
    <div className={tone === "attention" ? "attention" : undefined}>
      <button
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        className="ops-metric-trigger"
        ref={triggerRef}
        type="button"
        onBlur={(event) => {
          if (!popoverRef.current?.contains(event.relatedTarget as Node | null)) hide();
        }}
        onClick={show}
        onFocus={show}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
      >
        <strong>{formattedTotal}</strong>
      </button>
      <span>{label}</span>
      {popover}
    </div>
  );
}
