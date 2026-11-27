import { type CSSProperties, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { reduceMovimiento, useAlEntrar } from '../utilidades/movimiento';

export const MS_POR_PASO = 4000;

const PASOS = [
  {
    titulo: '1 · Buscá',
    texto: 'Definí el perfil: posición, edad, liga, presupuesto y métricas.',
    ruta: 'statsline.onrender.com/buscar',
  },
  {
    titulo: '2 · Elegí 2 o 3',
    texto: 'Marcá a los candidatos que más te interesan.',
    ruta: 'statsline.onrender.com/buscar?ver=1',
  },
  {
    titulo: '3 · Compará',
    texto: 'Mirá quién es mejor, intermedio o peor en cada métrica y bajá el PDF.',
    ruta: 'statsline.onrender.com/comparar',
  },
];

// Cifras de ejemplo (UI-003, UI-014): no salen de la base ni nombran a jugadores reales
const BARRAS = [
  {
    etiqueta: 'Minutos jugados',
    filas: [
      ['Jugador A', '2.243', 100, 'is-best'],
      ['Jugador B', '1.572', 70, 'is-medio'],
      ['Jugador C', '1.382', 62, 'is-worst'],
    ],
  },
  {
    etiqueta: '% pases completados',
    filas: [
      ['Jugador A', '80', 80, 'is-medio'],
      ['Jugador B', '74', 74, 'is-worst'],
      ['Jugador C', '84', 84, 'is-best'],
    ],
  },
] as const;

function Escena({ paso }: { paso: number }) {
  if (paso === 0) {
    return (
      <>
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
          <span className="mini-chip">Defensor ×</span>
          <span className="mini-chip">Liga Profesional ×</span>
        </span>
        <span className="mini-boton">Ver resultados</span>
      </>
    );
  }
  if (paso === 1) {
    return (
      <>
        <span className="mini-demo__txt">6 resultados</span>
        <span className="mini-tarjetas">
          {['Jugador A', 'Jugador B', 'Jugador C'].map((j, i) => (
            <span key={j} className={`mini-tarjeta${i < 2 ? ' is-sel' : ''}`}>
              <span className="avatar avatar--defensor">{`J${j.slice(-1)}`}</span>
              <b>{j}</b>
              <small>{i < 2 ? '✓ Comparar' : 'Comparar'}</small>
            </span>
          ))}
        </span>
        <span className="mini-boton">Comparar 2</span>
      </>
    );
  }
  return (
    <>
      {BARRAS.map((m) => (
        <span key={m.etiqueta} className="mini-demo--barras">
          <small className="mini-demo__lbl">{m.etiqueta}</small>
          {m.filas.map(([jugador, valor, ancho, clase], i) => (
            <span key={jugador} className={`mini-barra ${clase}`}>
              <span>{jugador}</span>
              <b className="cifra">{valor}</b>
              <span className="mini-barra__pista">
                <i style={{ '--ancho': `${ancho}%`, '--i': i } as CSSProperties} />
              </span>
            </span>
          ))}
        </span>
      ))}
      <span className="mini-boton mini-boton--sec">Exportar PDF</span>
    </>
  );
}

/** UI-014: "Cómo funciona" como demo guiada. Los tres pasos son pestañas; la ventana de la app
 *  avanza sola cada 4 s cuando la sección está en pantalla, hasta que se elige un paso o se pausa.
 *  Con movimiento reducido no avanza sola. La mini pantalla es decorativa. */
export default function DemoGuiada() {
  const ref = useRef<HTMLElement>(null);
  const visible = useAlEntrar(ref);
  const [reducido] = useState(reduceMovimiento);
  const [paso, setPaso] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(!reducido);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  useEffect(() => {
    if (!reproduciendo || !visible) return;
    const t = window.setTimeout(() => setPaso((p) => (p + 1) % PASOS.length), MS_POR_PASO);
    return () => window.clearTimeout(t);
  }, [paso, reproduciendo, visible]);

  function elegir(i: number, foco = false) {
    setPaso(i);
    setReproduciendo(false);
    if (foco) botones.current[i]?.focus();
  }

  function alTeclear(e: KeyboardEvent, i: number) {
    const n = PASOS.length;
    const destino = {
      ArrowRight: (i + 1) % n,
      ArrowDown: (i + 1) % n,
      ArrowLeft: (i + n - 1) % n,
      ArrowUp: (i + n - 1) % n,
      Home: 0,
      End: n - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    elegir(destino, true);
  }

  const avanzando = reproduciendo && visible;
  return (
    <section ref={ref} id="como-funciona" className="band band--paso" aria-label="Cómo funciona">
      <div className="wrap">
        <div className="section__head">
          <span className="eyebrow">Cómo funciona</span>
          <h2>De la búsqueda a la decisión en tres pasos.</h2>
        </div>
        <div className="demo">
          <div className="demo__lado">
            <div
              className="demo__pasos"
              role="tablist"
              aria-label="Pasos"
              aria-orientation="vertical"
            >
              {PASOS.map((p, i) => (
                <button
                  key={p.titulo}
                  ref={(b) => {
                    botones.current[i] = b;
                  }}
                  id={`${id}-paso-${i}`}
                  type="button"
                  role="tab"
                  className="demo__paso"
                  aria-selected={paso === i}
                  aria-controls={`${id}-panel`}
                  tabIndex={paso === i ? 0 : -1}
                  onClick={() => elegir(i)}
                  onKeyDown={(e) => alTeclear(e, i)}
                >
                  <b>{p.titulo}</b>
                  <span>{p.texto}</span>
                  {avanzando && paso === i && (
                    <i
                      className="demo__progreso"
                      style={{ animationDuration: `${MS_POR_PASO}ms` }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
            {!reducido && (
              <button
                type="button"
                className="btn btn--ghost btn--sm demo__pausa"
                onClick={() => setReproduciendo(!reproduciendo)}
              >
                {reproduciendo ? 'Pausar demo' : 'Reproducir demo'}
              </button>
            )}
          </div>
          <div
            id={`${id}-panel`}
            className="demo__ventana"
            role="tabpanel"
            aria-labelledby={`${id}-paso-${paso}`}
          >
            <div className="demo__pantalla" aria-hidden="true">
              <div className="demo__barra">
                <i />
                <i />
                <i />
                <span className="demo__ruta">{PASOS[paso].ruta}</span>
                <span className="rotulo-ejemplo">Ejemplo</span>
              </div>
              <div key={paso} className="demo__escena">
                <Escena paso={paso} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
