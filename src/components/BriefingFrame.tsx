"use client";
import type { ReactNode } from "react";
import { briefingClass, briefingDate, BRIEFING_CONTENT, BRIEFING_SIZE } from "@/modules/grupamento/briefing";

export function BriefingFrame({ monitorId, updatedAt, children, captureReady = false, playlistCount = 0, frameIndex = 0, frameLabel = "" }: { monitorId: number; updatedAt?: string | null; children: ReactNode; captureReady?: boolean; playlistCount?: number; frameIndex?: number; frameLabel?: string }) {
  return <main data-mcl-capture-root="1" data-mcl-capture-ready={captureReady ? "1" : "0"} data-mcl-playlist-count={playlistCount} data-mcl-frame-index={frameIndex} data-mcl-frame-label={frameLabel} className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black" style={{ containerType: "size" }}>
    <div className="mcl-briefing-frame relative overflow-hidden bg-white text-slate-950" style={{ width: `min(100cqw, calc(100cqh * ${BRIEFING_SIZE.width / BRIEFING_SIZE.height}))`, aspectRatio: `${BRIEFING_SIZE.width}/${BRIEFING_SIZE.height}`, containerType: "inline-size", backgroundImage: "url(/briefing/frame.png)", backgroundSize: "100% 100%", fontFamily: "Arial, sans-serif" }}>
      <div className="absolute flex items-center justify-center font-bold text-white" style={{ left: "32.32%", top: "4.124%", width: "52.67%", height: "8.2%", fontSize: "2.645cqw" }}>{briefingClass(monitorId)}</div>
      <section className="absolute overflow-hidden" style={{ left: `${BRIEFING_CONTENT.x * 100}%`, top: `${BRIEFING_CONTENT.y * 100}%`, width: `${BRIEFING_CONTENT.w * 100}%`, height: `${BRIEFING_CONTENT.h * 100}%` }}>{children}</section>
      <div className="absolute flex items-center justify-center font-bold text-black" style={{ left: "80.852%", top: "96.368%", width: "19.129%", height: "3.679%", fontSize: "1.152cqw" }}>{briefingDate(updatedAt)}</div>
    </div>
  </main>;
}
