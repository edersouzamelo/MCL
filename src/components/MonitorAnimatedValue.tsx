"use client";

import { useEffect, useState } from "react";

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function useAnimatedValue(
  value: number,
  options: { duration?: number; delay?: number } = {},
) {
  const duration = options.duration ?? 1_350;
  const delay = options.delay ?? 80;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    let cancelled = false;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !Number.isFinite(value)) {
      frame = window.requestAnimationFrame(() => setDisplay(value));
      return () => window.cancelAnimationFrame(frame);
    }

    frame = window.requestAnimationFrame(() => setDisplay(0));
    timer = window.setTimeout(() => {
      const startedAt = performance.now();

      const animate = (time: number) => {
        if (cancelled) return;
        const progress = Math.min(1, (time - startedAt) / duration);
        setDisplay(value * easeOutCubic(progress));
        if (progress < 1) frame = window.requestAnimationFrame(animate);
      };

      frame = window.requestAnimationFrame(animate);
    }, delay);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [delay, duration, value]);

  return display;
}

export function AnimatedPercent({
  value,
  className = "",
  duration,
  delay,
}: {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const display = useAnimatedValue(value, { duration, delay });
  return (
    <span className={`mcl-animated-value relative inline-grid tabular-nums ${className}`}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>{value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
      <span className="col-start-1 row-start-1">{display.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
    </span>
  );
}

export function AnimatedCurrency({
  value,
  className = "",
  duration,
  delay,
  maximumFractionDigits = 2,
}: {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
  maximumFractionDigits?: number;
}) {
  const display = useAnimatedValue(value, { duration, delay });
  const format = (number: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits }).format(number);
  return (
    <span className={`mcl-animated-value relative inline-grid tabular-nums ${className}`}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>{format(value)}</span>
      <span className="col-start-1 row-start-1">{format(display)}</span>
    </span>
  );
}
