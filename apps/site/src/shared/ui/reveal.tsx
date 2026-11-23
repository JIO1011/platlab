"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import estilos from "./reveal.module.css";

/**
 * Aparece suavemente al entrar en pantalla. Sin JavaScript o con «reducir movimiento»
 * el contenido se ve desde el principio: nunca queda oculto.
 */
export function Reveal({ children, className = "", retraso = 0 }: { children: ReactNode; className?: string; retraso?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"visible" | "espera" | "visto">("visible");

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Solo se oculta lo que está debajo del pliegue; lo que ya se ve no parpadea.
    if (nodo.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    setEstado("espera");
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setEstado("visto");
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(nodo);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${estilos.reveal} ${estado === "espera" ? estilos.espera : ""} ${className}`} style={{ transitionDelay: `${retraso}ms` }}>
      {children}
    </div>
  );
}
