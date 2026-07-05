"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { animationsEnabled } = useSettings();
  
  // When transitioning is true, the screen goes black.
  // It starts as true so it fades in from black on first load/route change.
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Fade IN from black whenever the pathname changes
  useEffect(() => {
    setIsTransitioning(false);
  }, [pathname]);

  // Intercept clicks on links to fade OUT to black
  useEffect(() => {
    if (!animationsEnabled) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        href &&
        href.startsWith("/") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        if (href === window.location.pathname) return; // same page

        e.preventDefault();
        setIsTransitioning(true);

        // Wait 400ms for fade out, then navigate
        setTimeout(() => {
          router.push(href);
        }, 400);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [router, animationsEnabled]);

  if (!animationsEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="w-full h-full flex flex-col flex-1">
        {children}
      </div>
      <div
        className={`pointer-events-none fixed inset-0 z-[9999] bg-zinc-950 transition-opacity duration-500 ease-in-out ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
