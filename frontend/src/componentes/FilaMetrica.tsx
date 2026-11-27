import { useEffect, useId, useRef, useState } from 'react';

import type { FilaComparacion } from '../tipos/api';
import { escalaDeFila } from '../utilidades/comparacion';
import { useAlEntrar, useProgreso, valorAnimado } from '../utilidades/movimiento';
import Dato from './Dato';

export interface JugadorFila {
  id: number;
  nombre: string;
  letra: string;
  oculto: boolean;
  /** promedio de su posición para esta métrica (RN-015); null si no hay */
  promedio: number | null;
}

interface Props {
  fila: FilaComparacion;
  jugadores: JugadorFila[];
  mejor: number[];
  peor: number[];
  /** otra fila o un jugador tiene el foco: esta se atenúa */
  atenuada: boolean;
  jugadorFoco: number | null;
  onFocoMetrica: (metrica: string | null) => void;
}

const formatoDif = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const formatoNum = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** Una métrica de la comparación (CMP-004): barras que entran, tooltip, marca del promedio,
 *  resaltado cruzado y accesibilidad por teclado. */
export default function FilaMetrica({
  fila,
  jugadores,
  mejor,
  peor,
  atenuada,
  jugadorFoco,
  onFocoMetrica,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useAlEntrar(ref);
  const progreso = useProgreso(visible);
  const [activo, setActivo] = useState<number | null>(null);
  const idTip = useId();

  // Tocar afuera cierra el tooltip (celular)
  useEffect(() => {
    if (activo === null) return;
    const cerrar = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setActivo(null);
    };
    document.addEventListener('pointerdown', cerrar);
    return () => document.removeEventListener('pointerdown', cerrar);
  }, [activo]);

  const valores = fila.valores;
  const escala = escalaDeFila(
    valores.filter((_, i) => !jugadores[i].oculto),
    jugadores.map((j) => j.promedio),
  );
  const faltan = valores.filter((v, i) => v === null && !jugadores[i].oculto).length;

  return (
    <div
      ref={ref}
      className={`mrow${atenuada ? ' is-dim' : ''}`}
      onMouseEnter={() => onFocoMetrica(fila.metrica)}
      onMouseLeave={() => onFocoMetrica(null)}
    >
      <div className="mrow__lbl">
        {fila.etiqueta}
        {faltan > 0 && <span className="chip chip--warn">Falta en {faltan}</span>}
      </div>
      <div className="mrow__bars">
        {jugadores.map((j, i) => {
          const v = valores[i];
          const esMejor = mejor.includes(j.id);
          const esPeor = peor.includes(j.id);
          const pct = v === null || escala === 0 ? 0 : Math.max(3, (v / escala) * 100);
          const pctProm =
            j.promedio === null || escala === 0 ? null : Math.min(99, (j.promedio / escala) * 100);
          const etiqueta = `${j.letra}, ${fila.etiqueta}, ${v === null ? 'Dato no disponible' : v}${
            esMejor ? ', Mejor' : esPeor ? ', Peor' : ''
          }`;
          const clases = [
            'bar__track',
            j.oculto ? 'is-oculto' : '',
            jugadorFoco !== null && jugadorFoco !== j.id ? 'is-dim' : '',
            activo === j.id ? 'is-activa' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const abierto = activo === j.id;
          return (
            <div key={j.id} className="bar">
              <span className="bar__who">
                {j.letra} · {j.nombre.split(' ')[0]}
              </span>
              <div
                className={clases}
                role="img"
                aria-label={etiqueta}
                aria-describedby={abierto ? idTip : undefined}
                tabIndex={0}
                onFocus={() => setActivo(j.id)}
                onBlur={() => setActivo((a) => (a === j.id ? null : a))}
                onMouseEnter={() => setActivo(j.id)}
                onMouseLeave={() => setActivo((a) => (a === j.id ? null : a))}
                onClick={() => setActivo((a) => (a === j.id ? null : j.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setActivo(null);
                }}
              >
                <div
                  className={`bar__fill${esMejor ? ' is-best' : esPeor ? ' is-worst' : ''}`}
                  style={{
                    width: `${visible ? pct : 0}%`,
                    transitionDelay: `${i * 90}ms`,
                  }}
                />
                {pctProm !== null && (
                  <i
                    className="bar__prom"
                    data-testid="marca-promedio"
                    style={{ left: `${pctProm}%` }}
                  />
                )}
              </div>
              <span className="bar__v num">
                {esMejor && <b className="bar__tag">Mejor</b>}
                <Dato valor={v === null ? null : valorAnimado(v, progreso)} />
              </span>
              {abierto && (
                <div id={idTip} role="tooltip" className="tip">
                  <b>
                    {j.letra} · {j.nombre}
                  </b>
                  <span>
                    {fila.etiqueta}:{' '}
                    {v === null ? <Dato valor={null} /> : <b>{formatoNum.format(v)}</b>}
                  </span>
                  {v !== null &&
                    jugadores.map((o, k) => {
                      const ov = valores[k];
                      if (o.id === j.id || o.oculto || ov === null) return null;
                      return (
                        <span key={o.id}>
                          vs. {o.letra}: <b>{formatoDif.format(v - ov)}</b>
                        </span>
                      );
                    })}
                  {j.promedio !== null && (
                    <span>
                      Promedio de la posición: <b>{formatoNum.format(j.promedio)}</b>
                      {v !== null && <> ({formatoDif.format(v - j.promedio)})</>}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
