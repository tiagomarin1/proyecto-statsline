import { useEffect, useId, useRef, useState } from 'react';

import type { FilaComparacion } from '../tipos/api';
import { porcentajeBarra } from '../utilidades/comparacion';
import { formatearNumero } from '../utilidades/formato';
import { useAlEntrar, useProgreso, valorAnimado } from '../utilidades/movimiento';
import Dato from './Dato';
import InfoMetrica from './InfoMetrica';

export interface JugadorFila {
  id: number;
  nombre: string;
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
  /** CMP-006: dibuja la marca del promedio de la posición sobre las barras (apagada por defecto) */
  mostrarPromedio?: boolean;
}

const formatoDif = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

/** Una métrica de la comparación (CMP-007): los jugadores van uno debajo del otro. Cada fila
 *  tiene el nombre completo, el número y una barra de ancho completo que se llena hasta el valor
 *  (RN-037). El mejor va en verde y el peor en rojo (RN-006). Las diferencias contra los otros y
 *  el promedio de la posición quedan en el tooltip, que aparece al pasar, tocar o enfocar. */
export default function FilaMetrica({
  fila,
  jugadores,
  mejor,
  peor,
  atenuada,
  jugadorFoco,
  onFocoMetrica,
  mostrarPromedio = false,
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
  const valoresVisibles = valores.filter((_, i) => !jugadores[i].oculto);
  const faltan = valoresVisibles.filter((v) => v === null).length;

  return (
    <div
      ref={ref}
      className={`mrow${atenuada ? ' is-dim' : ''}`}
      onMouseEnter={() => onFocoMetrica(fila.metrica)}
      onMouseLeave={() => onFocoMetrica(null)}
    >
      <div className="mrow__lbl">
        {fila.etiqueta}
        <InfoMetrica metrica={fila.metrica} etiqueta={fila.etiqueta} />
        {faltan > 0 && <span className="chip chip--warn">Falta en {faltan}</span>}
      </div>
      <div className="mrow__filas">
        {jugadores.map((j, i) => {
          const v = valores[i];
          const esMejor = mejor.includes(j.id);
          const esPeor = peor.includes(j.id);
          const pct = porcentajeBarra(
            fila.metrica,
            v,
            valoresVisibles,
            mostrarPromedio ? j.promedio : null,
          );
          const pctProm =
            mostrarPromedio && j.promedio !== null
              ? Math.min(99, porcentajeBarra(fila.metrica, j.promedio, valoresVisibles, j.promedio))
              : null;
          const etiqueta = `${j.nombre}, ${fila.etiqueta}, ${
            v === null ? 'Dato no disponible' : formatearNumero(v)
          }${esMejor ? ', Mejor' : esPeor ? ', Peor' : ''}`;
          const abierto = activo === j.id;
          const clases = [
            'fila-cmp',
            esMejor ? 'is-best' : '',
            esPeor ? 'is-worst' : '',
            // CMP-007: la que tiene dato y no es ni Mejor ni Peor va en amarillo
            v !== null && !esMejor && !esPeor ? 'is-medio' : '',
            j.oculto ? 'is-oculto' : '',
            jugadorFoco !== null && jugadorFoco !== j.id ? 'is-dim' : '',
            abierto ? 'is-activa' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={j.id} className="fila-cmp__caja">
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
                <span className="fila-cmp__nombre">{j.nombre}</span>
                <span className="fila-cmp__valor">
                  {(esMejor || esPeor) && (
                    <span className={`fila-cmp__tag fila-cmp__tag--${esMejor ? 'mejor' : 'peor'}`}>
                      {esMejor ? 'Mejor' : 'Peor'}
                    </span>
                  )}
                  <b className="fila-cmp__num">
                    <Dato valor={v === null ? null : valorAnimado(v, progreso)} />
                  </b>
                </span>
                <span className="fila-cmp__pista" aria-hidden="true">
                  <i
                    className="fila-cmp__barra"
                    style={{ width: `${visible ? pct : 0}%`, transitionDelay: `${i * 90}ms` }}
                  />
                  {pctProm !== null && (
                    <i
                      className="fila-cmp__prom"
                      data-testid="marca-promedio"
                      style={{ left: `${pctProm}%` }}
                    />
                  )}
                </span>
              </div>
              {abierto && (
                <div id={idTip} role="tooltip" className="tip fila-cmp__tip">
                  <b>{j.nombre}</b>
                  <span>
                    {fila.etiqueta}:{' '}
                    {v === null ? <Dato valor={null} /> : <b>{formatearNumero(v)}</b>}
                  </span>
                  {v !== null &&
                    jugadores.map((o, k) => {
                      const ov = valores[k];
                      if (o.id === j.id || o.oculto || ov === null) return null;
                      return (
                        <span key={o.id}>
                          vs. {o.nombre}: <b>{formatoDif.format(v - ov)}</b>
                        </span>
                      );
                    })}
                  {j.promedio !== null && (
                    <span>
                      Promedio de la posición: <b>{formatearNumero(j.promedio)}</b>
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
