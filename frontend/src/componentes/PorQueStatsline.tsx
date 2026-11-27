import { type CSSProperties, useRef } from 'react';

import { useAlEntrar } from '../utilidades/movimiento';

// UI-014: cifras de ejemplo, como la tarjeta del hero (UI-003). No salen de la base ni nombran a
// jugadores reales. La barra es el valor sobre el mayor de la fila, con los colores de CMP-007.
const BARRAS = [
  { jugador: 'Jugador A', minutos: '2.243', ancho: 100, clase: 'is-best' },
  { jugador: 'Jugador B', minutos: '1.572', ancho: 70, clase: 'is-medio' },
  { jugador: 'Jugador C', minutos: '1.382', ancho: 62, clase: 'is-worst' },
];
const CHIPS = ['Defensor', 'Liga Profesional', 'Pases desde 75 %'];
const RESULTADOS = [
  { jugador: 'Jugador A', iniciales: 'JA', posicion: 'defensor', rating: '6,93' },
  { jugador: 'Jugador B', iniciales: 'JB', posicion: 'defensor', rating: '6,69' },
  { jugador: 'Jugador C', iniciales: 'JC', posicion: 'defensor', rating: '6,66' },
];

/** UI-014: "Por qué StatsLine" como bento. Cada razón trae una mini demo de la app (decorativa) en
 *  lugar de un ícono. Con movimiento reducido las mini demos quedan quietas y completas. */
export default function PorQueStatsline() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useAlEntrar(ref);

  return (
    <section className="band" aria-label="Por qué StatsLine">
      <div className="wrap">
        <div className="section__head">
          <span className="eyebrow">Por qué StatsLine</span>
          <h2>Decisiones de mercado con respaldo.</h2>
        </div>
        <div ref={ref} className={`bento${visible ? ' is-visible' : ''}`}>
          <article className="card feature bento__tarjeta bento__grande">
            <h3>Filtrá por lo que importa</h3>
            <p>
              Posición, edad, liga, valor de mercado y métricas de rendimiento en un solo panel.
            </p>
            <div className="mini-demo mini-demo--filtros" aria-hidden="true">
              <div className="mini-campos">
                <span className="mini-campo">
                  <small>Posición</small>
                  <span>Defensor</span>
                </span>
                <span className="mini-campo">
                  <small>Liga</small>
                  <span>Liga Profesional</span>
                </span>
                <span className="mini-campo">
                  <small>Edad</small>
                  <span>20 a 30</span>
                </span>
              </div>
              <span className="mini-chips">
                {CHIPS.map((c, i) => (
                  <span key={c} className="mini-chip" style={{ '--i': i } as CSSProperties}>
                    {c} ×
                  </span>
                ))}
              </span>
              <span className="mini-contador">
                <b className="cifra">6</b> candidatos de 40 jugadores
              </span>
              <span className="mini-resultados">
                {RESULTADOS.map((r) => (
                  <span key={r.jugador} className="mini-resultado">
                    <span className={`avatar avatar--${r.posicion}`}>{r.iniciales}</span>
                    <span className="mini-resultado__nombre">
                      <b>{r.jugador}</b>
                      <small>Defensor · Liga Profesional</small>
                    </span>
                    <b className="cifra">{r.rating}</b>
                  </span>
                ))}
              </span>
            </div>
          </article>

          <article className="card feature bento__tarjeta">
            <h3>Rendimiento y presupuesto, juntos</h3>
            <p>Compará lo que rinde cada jugador con lo que cuesta, lado a lado.</p>
            <div className="mini-demo mini-demo--barras" aria-hidden="true">
              <small className="mini-demo__lbl">Minutos jugados</small>
              {BARRAS.map((b, i) => (
                <span key={b.jugador} className={`mini-barra ${b.clase}`}>
                  <span>{b.jugador}</span>
                  <b className="cifra">{b.minutos}</b>
                  <span className="mini-barra__pista">
                    <i style={{ '--ancho': `${b.ancho}%`, '--i': i } as CSSProperties} />
                  </span>
                </span>
              ))}
            </div>
          </article>

          <article className="card feature bento__tarjeta">
            <h3>Seguimiento</h3>
            <p>Guardá a los jugadores que te interesan y volvé a ellos cuando armes el plantel.</p>
            <div className="mini-demo mini-demo--seguimiento" aria-hidden="true">
              <span className="mini-estrella">★</span>
              <span className="mini-pila">
                <span className="avatar avatar--defensor">JA</span>
                <span className="avatar avatar--mediocampista">JB</span>
                <span className="avatar avatar--delantero">JC</span>
              </span>
              <span className="mini-demo__txt">3 guardados</span>
            </div>
          </article>
        </div>
        <p className="bento__nota">
          <span className="rotulo-ejemplo">Ejemplo</span> Las mini demos usan cifras ilustrativas.
        </p>
      </div>
    </section>
  );
}
