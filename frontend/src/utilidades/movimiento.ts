import { type RefObject, useEffect, useState } from 'react';

/** UI-005: true si el sistema pide "reducir movimiento". */
export function reduceMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Se puede animar si hay IntersectionObserver y no se pidió reducir el movimiento. */
export const puedeAnimar = () => typeof IntersectionObserver !== 'undefined' && !reduceMovimiento();

/** CMP-004: true cuando el elemento entra en pantalla (una sola vez). Sin soporte, ya está. */
export function useAlEntrar(ref: RefObject<Element>): boolean {
  const [visible, setVisible] = useState(!puedeAnimar());
  useEffect(() => {
    const el = ref.current;
    if (visible || !el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, visible]);
  return visible;
}

/** Progreso 0→1 (ease-out) cuando `activo` pasa a true. Sin animación devuelve siempre 1. */
export function useProgreso(activo: boolean, duracionMs = 700, retrasoMs = 0): number {
  const [p, setP] = useState(puedeAnimar() ? 0 : 1);
  useEffect(() => {
    if (!activo || p >= 1) return;
    let raf = 0;
    let inicio: number | null = null;
    const paso = (t: number) => {
      inicio ??= t;
      const x = Math.min(1, Math.max(0, (t - inicio - retrasoMs) / duracionMs));
      setP(1 - Math.pow(1 - x, 3));
      if (x < 1) raf = requestAnimationFrame(paso);
      else setP(1);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
  return p;
}

/** Valor intermedio de una cuenta animada, con los mismos decimales que el valor final. */
export function valorAnimado(final: number, progreso: number): number {
  if (progreso >= 1) return final;
  const dec = String(final).split('.')[1]?.length ?? 0;
  return Number((final * progreso).toFixed(dec));
}
