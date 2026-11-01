import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useSesion } from '../contexto/SesionContext';

// Primera C y D quedan fuera: por ahora no tienen datos (RN-028).
const LIGAS = ['Liga Profesional', 'Primera Nacional', 'B Metropolitana', 'Federal A'];

// Filas de la maqueta: nombre, posición, valor de mercado (EUR) y rating (ilustrativo, no reales).
const FILAS = [
  { n: 'Lateral izq.', v: 'EUR 180k', s: 7.4 },
  { n: 'Volante central', v: 'EUR 240k', s: 7.1 },
  { n: 'Extremo der.', v: 'EUR 150k', s: 6.8 },
  { n: 'Delantero', v: 'EUR 310k', s: 7.3 },
];

const BENEFICIOS = [
  {
    icono: '◎',
    titulo: 'Filtrá por lo que importa',
    texto: 'Posición, edad, liga, valor de mercado y métricas de rendimiento en un solo panel.',
  },
  {
    icono: '↗',
    titulo: 'Rendimiento y presupuesto, juntos',
    texto: 'Compará lo que rinde cada jugador con lo que cuesta, lado a lado.',
  },
  {
    icono: '★',
    titulo: 'Seguimiento',
    texto: 'Guardá a los jugadores que te interesan y volvé a ellos cuando armes el plantel.',
  },
];

/** Home pública: hero con maqueta, ligas y beneficios; CTA según haya sesión o no. */
export default function Inicio() {
  const { usuario } = useSesion();
  const [liga, setLiga] = useState(LIGAS[0]);
  const destino = usuario ? '/buscar' : '/registro';

  return (
    <>
      <section className="hero">
        <div className="hero__in wrap">
          <div className="reveal">
            <h1>
              Fichá con datos,
              <br />
              no <em>a ojo</em>.
            </h1>
            <p className="hero__lead">
              Compará jugadores por rendimiento y presupuesto en una sola plataforma, pensada para
              clubes chicos y medianos, sin necesidad de un analista de datos.
            </p>
            <div className="hero__cta">
              <Link className="btn btn--sky btn--lg" to={destino}>
                {usuario ? 'Buscar jugadores' : 'Empezar ahora'} <span aria-hidden="true">→</span>
              </Link>
              {!usuario && (
                <Link className="btn btn--onNavy btn--lg" to="/ingresar">
                  Ya tengo cuenta
                </Link>
              )}
            </div>
            <div className="ligas" role="group" aria-label="Ligas disponibles">
              {LIGAS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className="liga"
                  aria-pressed={liga === l}
                  onClick={() => setLiga(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="shot reveal reveal--2" aria-hidden="true">
            <div className="shot__bar">
              <span className="shot__dot" />
              <span className="shot__dot" />
              <span className="shot__dot" />
              <span className="shot__url">statsline · buscar</span>
            </div>
            <div className="shot__body">
              <div className="shot__side">
                <span className="shot__lbl">Liga</span>
                <span className="shot__inp shot__inp--txt">{liga}</span>
                <span className="shot__lbl">Presupuesto</span>
                <span className="shot__inp" />
                <span className="shot__lbl">Edad</span>
                <span className="shot__inp" />
                <span className="shot__btn" />
              </div>
              <div className="shot__main" key={liga}>
                <div className="shot__row shot__row--head">
                  <span className="shot__name" />
                  <span className="shot__val" />
                  <span className="shot__val" />
                </div>
                {FILAS.map((f, i) => (
                  <div
                    className="shot__row shot__row--in"
                    key={f.n}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span className="shot__txt">{f.n}</span>
                    <span className="shot__txt shot__txt--m">{f.v}</span>
                    <span className="shot__score">{f.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Por qué StatsLine</span>
            <h2>Decisiones de mercado con respaldo.</h2>
          </div>
          <div className="steps">
            {BENEFICIOS.map((b) => (
              <article className="card step feature" key={b.titulo}>
                <span className="feature__i" aria-hidden="true">
                  {b.icono}
                </span>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--cta">
        <div className="cta__in wrap">
          <h2>Tu próximo refuerzo está en los datos.</h2>
          <Link className="btn btn--sky btn--lg" to={destino}>
            {usuario ? 'Ir a buscar' : 'Crear cuenta gratis'} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
