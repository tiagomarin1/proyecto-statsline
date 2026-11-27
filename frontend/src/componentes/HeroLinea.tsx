import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type CSSProperties, type MouseEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import pasto from '../assets/hero/02-pasto-linea.webp';
import pelota from '../assets/hero/06-pelota.webp';
import TituloEscrito, { tocaEscribir } from './TituloEscrito';

// Primera C y D quedan fuera: por ahora no tienen datos (RN-028).
const LIGAS = ['Liga Profesional', 'Primera Nacional', 'B Metropolitana', 'Federal A'];

// Tarjeta de ejemplo (UI-003): las cifras son ilustrativas, no salen de la base, y la tarjeta lo
// dice con el rótulo "Ejemplo". La barra es el valor sobre el mayor de la fila.
const EJEMPLO = [
  { etiqueta: '% pases', a: 84, b: 79, sufijo: '%' },
  { etiqueta: '% duelos', a: 62, b: 68, sufijo: '%' },
  { etiqueta: 'Recuperaciones', a: 3.4, b: 2.9, sufijo: '' },
];
const formatoNum = new Intl.NumberFormat('es-AR');

const DURACION = 9;

/** UI-011: lo que entra escalonado después del título, en este orden (opacidad y un desplazamiento
 *  corto). Son wrappers propios: no son los que mueve el pin de GSAP ni el "golpe" del botón. */
const entra = (orden: number) => ({
  className: 'hero-entra',
  style: { '--orden': orden } as CSSProperties,
});

interface Props {
  conSesion: boolean;
  destino: string;
}

/**
 * Hero de la home (UI-003): texto a la izquierda y una tarjeta de ejemplo de comparación a la
 * derecha. Una pelota rueda de izquierda a derecha por la línea de la cancha con el scroll: en
 * escritorio el hero se fija mientras rueda; en el celular no se fija y la pelota, que ya está a la
 * vista, rueda a medida que el hero sale de pantalla.
 *
 * El CSS por defecto ya es el estado final (pelota en reposo, barras llenas), así que con movimiento
 * reducido o sin animación el hero se ve completo. La animación solo mueve `transform` y `opacity`.
 */
export function HeroLinea({ conSesion, destino }: Props) {
  const raiz = useRef<HTMLElement>(null);
  // UI-011: el título se escribe una vez por carga y con movimiento permitido; si no, el hero
  // aparece completo (el estado en reposo es el completo)
  const [entrada, setEntrada] = useState<'escribiendo' | 'listo' | null>(() =>
    tocaEscribir() ? 'escribiendo' : null,
  );
  const clase = (base: string, orden: number) => {
    const e = entra(orden);
    return { className: `${base} ${e.className}`, style: e.style };
  };

  useGSAP(
    () => {
      const hero = raiz.current;
      if (!hero || typeof window.matchMedia !== 'function') return;

      // Se registra acá y no al importar: sin matchMedia (tests, navegadores viejos) no hace falta.
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();

      // movimiento reducido ("reduce") no entra acá: queda la versión estática, sin pin ni scrub.
      mm.add(
        {
          escritorio: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          movil: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          const movil = Boolean(ctx.conditions?.movil);
          const q = gsap.utils.selector(hero);

          // El hero se fija solo en escritorio. La barra es flotante y no ocupa lugar, también en
          // escritorio (UI-012): el hero se fija contra el borde de arriba y la barra pasa por encima.
          if (!movil) hero.dataset.anim = 'true';

          const ancho = hero.getBoundingClientRect().width;
          const bola = q('.hero__bola')[0] as HTMLElement | undefined;
          const radio = (bola?.offsetWidth ?? 100) / 2;
          // la pelota arranca a la vista: en el celular en su lugar y en escritorio cerca del borde
          const desde = () => (movil ? 0 : hero.getBoundingClientRect().width * 0.06);
          const hasta = () => hero.getBoundingClientRect().width;

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: movil
              ? {
                  trigger: hero,
                  start: 'top top',
                  end: 'bottom top',
                  scrub: 0.6,
                  invalidateOnRefresh: true,
                }
              : {
                  trigger: hero,
                  start: 'top top',
                  end: '+=300%',
                  pin: true,
                  scrub: 0.6,
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                },
          });

          // la foto se desliza sobre la línea y la sombra plana se aclara un poco
          tl.fromTo(
            q('.hero__foto'),
            { x: movil ? 40 : 80, scale: 1, transformOrigin: '50% 58.3%' },
            { x: movil ? -40 : -80, scale: 1.06, duration: DURACION },
            0,
          );
          tl.fromTo(q('.hero__sombra'), { opacity: 0.72 }, { opacity: 0.5, duration: DURACION }, 0);

          // la pelota recorre la línea y gira en proporción a lo que avanza (sin deslizar)
          tl.fromTo(q('.hero__bola'), { x: desde }, { x: hasta, duration: DURACION }, 0);
          tl.fromTo(
            q('.hero__bola-img'),
            { rotation: 0 },
            { rotation: ((ancho + radio * 2) / radio) * 57.2958, duration: DURACION },
            0,
          );

          // en escritorio, al llegar al final la pelota se apaga y el botón principal da un golpe
          if (!movil) {
            const boton = q('.hero__cta a')[0];
            tl.to(q('.hero__bola'), { opacity: 0, duration: 0.3 }, DURACION);
            if (boton) {
              tl.fromTo(
                boton,
                { scale: 1 },
                { scale: 1.07, duration: 0.3, ease: 'power2.out' },
                DURACION,
              );
              tl.to(boton, { scale: 1, duration: 0.3, ease: 'power2.inOut' }, DURACION + 0.3);
            }
          }

          return () => {
            delete hero.dataset.anim;
          };
        },
      );

      return () => mm.revert();
    },
    { scope: raiz },
  );

  function irAComoFunciona(e: MouseEvent<HTMLAnchorElement>) {
    const destino = document.getElementById('como-funciona');
    if (!destino) return;
    e.preventDefault();
    const reducido =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <section className="hero" ref={raiz} data-entrada={entrada ?? undefined}>
      <div className="hero__fondo" aria-hidden="true">
        <div className="hero__foto">
          <img src={pasto} alt="" width={1170} height={780} />
        </div>
        <div className="hero__sombra" />
      </div>

      <div className="hero__capa" aria-hidden="true">
        <div className="hero__bola">
          <span className="hero__bola-sombra" />
          <img className="hero__bola-img" src={pelota} alt="" width={224} height={224} />
        </div>
      </div>

      <div className="hero__in wrap">
        <div className="hero__texto">
          <p {...clase('hero__etiqueta', 0)}>Para clubes del fútbol argentino</p>
          <TituloEscrito animar={entrada !== null} onTerminar={() => setEntrada('listo')} />
          <p {...clase('hero__lead', 1)}>
            Compará jugadores por rendimiento y presupuesto, sin necesidad de un analista de datos.
          </p>
          <div {...clase('hero__cta', 2)}>
            <Link className="btn btn--oro btn--lg" to={destino}>
              {conSesion ? 'Buscar jugadores' : 'Empezar ahora'} <span aria-hidden="true">→</span>
            </Link>
            {!conSesion && (
              <Link className="btn btn--onDark btn--lg hero__sec" to="/ingresar">
                Ya tengo cuenta
              </Link>
            )}
          </div>
        </div>

        <figure {...clase('ejemplo', 3)} aria-label="Ejemplo de comparación">
          <figcaption className="ejemplo__cab">
            <span>Comparación</span>
            <span className="ejemplo__rotulo">Ejemplo</span>
          </figcaption>
          <div className="ejemplo__quienes">
            <div>
              <span className="ejemplo__letra">A</span>
              <b>Jugador A</b>
              <small>Defensor</small>
            </div>
            <div>
              <span className="ejemplo__letra">B</span>
              <b>Jugador B</b>
              <small>Defensor</small>
            </div>
          </div>
          <ul className="ejemplo__filas">
            {EJEMPLO.map((f, i) => {
              const tope = Math.max(f.a, f.b);
              return (
                <li key={f.etiqueta}>
                  <span className="ejemplo__lbl">{f.etiqueta}</span>
                  {[
                    { letra: 'A', v: f.a },
                    { letra: 'B', v: f.b },
                  ].map((j, k) => (
                    <div className="ejemplo__linea" key={j.letra}>
                      <span className="ejemplo__quien">{j.letra}</span>
                      <span className="ejemplo__pista" aria-hidden="true">
                        <i
                          className={`ejemplo__barra${j.v === tope ? ' is-best' : ''}`}
                          aria-hidden="true"
                          style={
                            {
                              '--w': `${Math.round((j.v / tope) * 100)}%`,
                              '--d': `${(i * 2 + k) * 90 + 250}ms`,
                            } as CSSProperties
                          }
                        />
                      </span>
                      <b className="ejemplo__v">
                        {formatoNum.format(j.v)}
                        {f.sufijo}
                      </b>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
          <p className="ejemplo__resumen">
            <b>A gana en 2 de 3 métricas</b>
            <span>Jugador B gana en % duelos</span>
          </p>
        </figure>

        <ul {...clase('ligas', 4)} aria-label="Ligas disponibles" tabIndex={0}>
          {LIGAS.map((liga) => (
            <li className="liga" key={liga}>
              {liga}
            </li>
          ))}
        </ul>

        <a {...clase('hero__scroll', 5)} href="#como-funciona" onClick={irAComoFunciona}>
          Ver cómo funciona
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </a>
      </div>
    </section>
  );
}
