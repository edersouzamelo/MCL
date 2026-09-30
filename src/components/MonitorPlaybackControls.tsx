"use client";

import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";

export function MonitorPlaybackControls({ light, state, previous, pause, play, stop, next }: {
  light: boolean; state: "playing" | "paused" | "stopped";
  previous: () => void; pause: () => void; play: () => void; stop: () => void; next: () => void;
}) {
  const button = "rounded-full p-2 transition hover:bg-sky-400/10 hover:text-sky-300";
  return <nav aria-label="Controles da apresentação" className={`relative z-10 flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 shadow-sm ${light ? "border-slate-300/70 bg-white/90 text-slate-700" : "border-white/10 bg-slate-950/80 text-slate-300"}`}>
    <button type="button" onClick={previous} className={button} aria-label="Voltar quadro" title="Voltar"><SkipBack className="h-4 w-4" /></button>
    <button type="button" onClick={pause} className={button} aria-label="Pausar apresentação" aria-pressed={state === "paused"} title="Pausar no quadro atual"><Pause className="h-4 w-4" /></button>
    <button type="button" onClick={play} className={button} aria-label="Reproduzir apresentação" aria-pressed={state === "playing"} title="Reproduzir do quadro atual"><Play className="h-4 w-4" /></button>
    <button type="button" onClick={stop} className={button} aria-label="Parar apresentação" aria-pressed={state === "stopped"} title="Parar e voltar ao primeiro quadro"><Square className="h-4 w-4" /></button>
    <button type="button" onClick={next} className={button} aria-label="Avançar quadro" title="Avançar"><SkipForward className="h-4 w-4" /></button>
  </nav>;
}
