import type { CSSProperties } from 'react';

import type { JugadorResumen } from '../tipos/api';
import { mejorYPeor } from '../utilidades/comparacion';
import { formatearEur } from '../utilidades/formato';
import Dato from './Dato';

type Clave = 'pases_precision_pct' | 'duelos_ganados_pct' | 'recuperaciones_por_partido' | 'rating';

const FILAS: { clave: Clave; etiqueta: string; sufijo: string }[] = [
  { clave: 'pases_precision_pct', etiqueta: 'Pases', sufijo: '%' },
  { clave: 'duelos_ganados_pct', etiqueta: 'Duelos ganados', sufijo: '%' },
  { clave: 'recuperaciones_por_partido', etiqueta: 'Recuperaciones por partido', sufijo: '' },
  { clave: 'rating', etiqueta: 'Rating', sufijo: '' },
];

/** CMP-005: mini-comparación con lo que ya trajo la búsqueda, sin pedidos nuevos. El mejor de cada
 *  fila sigue RN-006: el empate marca a todos y quien no tiene el dato no compite. */
export default function VistaRapida({ seleccion }: { seleccion: JugadorResumen[] }) {
  return (
    <section className="vr" aria-label="Vista rápida de la comparación">
      <div
        className="vr__grilla"
        style={
          {
            gridTemplateColumns: `140px repeat(${seleccion.length}, 1fr)`,
            '--cols': seleccion.length,
          } as CSSProperties
        }
      >
        <span />
        {seleccion.map((j) => (
          <div key={j.id} className="vr__col">
            <b>{j.nombre_completo}</b>
            <span>{j.edad !== null ? `${j.edad} años` : 'Edad no disponible'}</span>
            <span>
              {j.valor_mercado_eur !== null ? (
                formatearEur(j.valor_mercado_eur)
              ) : (
                <Dato valor={null} />
              )}
            </span>
          </div>
        ))}
        {FILAS.map((f) => {
          const { mejor } = mejorYPeor(
            Object.fromEntries(seleccion.map((j) => [j.id, j[f.clave]])),
          );
          return (
            <div key={f.clave} className="vr__fila">
              <span className="vr__lbl">{f.etiqueta}</span>
              {seleccion.map((j) => {
                const v = j[f.clave];
                const gana = mejor.includes(j.id);
                const valor = v === null ? 'Dato no disponible' : `${v}${f.sufijo}`;
                return (
                  <span
                    key={j.id}
                    className={`vr__v${gana ? ' is-best' : ''}`}
                    aria-label={`${f.etiqueta}, ${j.nombre_completo}: ${valor}${gana ? ', Mejor' : ''}`}
                  >
                    <Dato valor={v} sufijo={f.sufijo} />
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
