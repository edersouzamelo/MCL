"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BrandLogo } from "./BrandLogo";
import { useSettings } from "@/contexts/SettingsContext";

/*
 * Grade hexagonal flat-top (colmeia).
 *
 * O logotipo MCL é um cubo isométrico inscrito num hexágono regular
 * com a aresta superior horizontal (flat-top).  Para encaixar peças
 * como numa colmeia, usamos coordenadas axiais (q, r):
 *
 *   Pixel X = size * (3/2 * q)
 *   Pixel Y = size * (sqrt(3)/2 * q  +  sqrt(3) * r)
 *
 * O container pai define o "size" implicitamente: width do logo.
 * Abaixo traduzimos para porcentagem do container.
 */


// Anel 1 – 6 vizinhos imediatos
// Anel 2 – 12 vizinhos do segundo nível (opcional, pode ser reduzido)
const ring1: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

const ring2: [number, number][] = [
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
  [2, -1],
  [-2, 1],
  [1, 1],
  [-1, -1],
  [2, -2],
  [-2, 2],
  [-1, 2],
  [1, -2],
];

const allCoords = [...ring1, ...ring2];

/** Converte coordenadas axiais (q, r) em offset % do container
 *
 *  ATENÇÃO: CSS translate(X%, Y%) usa escalas DIFERENTES:
 *    translateX(%) → % da LARGURA do elemento
 *    translateY(%) → % da ALTURA do elemento
 *
 *  O container tem aspect-ratio 961:1152 (mais alto que largo).
 *  Para que 1% em X ≡ 1% em Y (mesma distância física), 
 *  precisamos multiplicar yPct por (961/1152) ≈ 0.834.
 *
 *  Espaçamento base (em % da largura do container):
 *    horizontal puro (q): ~95% → cópias lado a lado com pequeno gap
 *    diagonal (r): metade do horizontal + vertical √3/2
 */
function hexToPercent(q: number, r: number) {
  const S = 95;                          // espaçamento base em % da largura
  const AR = 961 / 1152;                 // aspect-ratio do container (< 1, mais alto)
  const xPct = q * S + r * (S * 0.5);   // hex flat-top: coluna pura = S, diagonal = S/2
  const yPct = (r * S * 0.866) * AR;    // √3/2 ≈ 0.866; corrigido pela aspect-ratio
  return { x: xPct, y: yPct };
}


interface GhostHexProps {
  q: number;
  r: number;
  idx: number;
  animationsEnabled: boolean;
}

function GhostHex({ q, r, idx, animationsEnabled }: GhostHexProps) {
  const { x, y } = hexToPercent(q, r);

  // Parâmetros determinísticos para fade (evita SSR mismatch)
  const duration = 5 + (idx % 5) * 1.8;          // 5 – 12.2 s
  const delay = ((idx * 1.7) % 8);                // 0 – ~8 s
  const peak = 0.06 + (idx % 4) * 0.02;           // 0.06 – 0.12

  const posStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    transform: `translate(${x}%, ${y}%)`,
    pointerEvents: "none",
  };

  if (!animationsEnabled) {
    return (
      <div style={{ ...posStyle, opacity: 0.05 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/mcl-logo-light.png"
          alt=""
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <motion.div
      style={posStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, peak, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/mcl-logo-light.png"
        alt=""
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </motion.div>
  );
}

export function HoneycombLogo() {
  const [isMounted, setIsMounted] = useState(false);
  const { animationsEnabled } = useSettings();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pré-calcula a lista de props para evitar recriação
  const ghosts = useMemo(
    () =>
      allCoords.map(([q, r], i) => ({
        q,
        r,
        idx: i,
        key: `${q},${r}`,
      })),
    [],
  );

  return (
    <div
      className="relative w-[min(70vw,360px)] lg:w-[460px]"
      style={{ aspectRatio: "961 / 1152" }}
    >
      {/* Logotipos fantasma da colmeia */}
      {isMounted &&
        ghosts.map((g) => (
          <GhostHex
            key={g.key}
            q={g.q}
            r={g.r}
            idx={g.idx}
            animationsEnabled={animationsEnabled}
          />
        ))}

      {/* Logotipo Central – camada superior, sempre visível e opaco */}
      <div className="absolute inset-0 z-10">
        <BrandLogo
          tone="light"
          priority
          className="h-auto w-full drop-shadow-[0_20px_55px_rgba(255,255,255,0.18)]"
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 360px, 460px"
        />
      </div>
    </div>
  );
}
