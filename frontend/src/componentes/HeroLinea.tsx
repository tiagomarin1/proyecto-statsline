import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { Link } from 'react-router-dom';

import pasto from '../assets/hero/02-pasto-linea.webp';
import pelota from '../assets/hero/06-pelota.webp';

// Primera C y D quedan fuera: por ahora no tienen datos (RN-028).
const LIGAS = ['Liga Profesional', 'Primera Nacional', 'B Metropolitana', 'Federal A'];

// Cifras de ejemplo de las tarjetas: son ilustrativas, no salen de la base (UI-003).
const DATOS = [
  { clase: 'p1', etiqueta: 'Pases', valor: '84%' },
  { clase: 'p2', etiqueta: 'Duelos', valor: '62%' },
  { clase: 'p3', etiqueta: 'Rating', valor: '7,3' },
  { clase: 'p4', etiqueta: 'Valor', valor: 'EUR 310k' },
];

const DURACION = 9;

interface Props {
  conSesion: boolean;
  destino: string;
}

/**
 * Hero de la home (UI-003): una pelota rueda de izquierda a derecha por la línea de la cancha
 * mientras se hace scroll, y a su paso aparecen puntos y tarjetas de datos.
 *
 * El CSS por defecto ya es el estado final (pelota en reposo, puntos y tarjetas visibles), así que
 * con movimiento reducido o sin animación el hero se ve completo. La animación solo mueve
 * `transform` y `opacity`.
 */
export function HeroLinea({ conSesion, destino }: Props) {
  const raiz = useRef<HTMLElement>(null);

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

          // El hero se fija debajo de la barra superior, que es sticky.
          const alturaBarra =
            document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0;
          hero.style.setProperty('--hero-barra', `${alturaBarra}px`);
          hero.dataset.anim = 'true';

          const ancho = hero.getBoundingClientRect().width;
          const bola = q('.hero__bola')[0] as HTMLElement | undefined;
          const radio = (bola?.offsetWidth ?? 100) / 2;
          const desde = () => -radio * 2;
          const hasta = () => hero.getBoundingClientRect().width;

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: hero,
              start: `top ${alturaBarra}px`,
              end: movil ? '+=220%' : '+=300%',
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          // la foto se desliza sobre la línea y la sombra plana se aclara un poco
          tl.fromTo(
            q('.hero__foto'),
            { x: 80, scale: 1, transformOrigin: '50% 58.3%' },
            { x: -80, scale: 1.06, duration: DURACION },
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

          // cada punto y su tarjeta aparecen cuando la pelota pasa por encima
          const puntos = q('.hero__punto');
          const tarjetas = q('.hero__dato');
          const recorrido = ancho + radio * 2;
          const izquierda = hero.getBoundingClientRect().left;
          puntos.forEach((punto: Element, i: number) => {
            const caja = punto.getBoundingClientRect();
            if (!caja.width) return;
            const centro = caja.left - izquierda + caja.width / 2;
            const t = Math.max(0.2, ((centro + radio) / recorrido) * DURACION);
            tl.fromTo(
              punto,
              { scale: 0 },
              { scale: 1, duration: 0.4, ease: 'back.out(2.5)' },
              t - 0.2,
            );
            tl.fromTo(
              tarjetas[i],
              { opacity: 0, y: 22 },
              { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
              t,
            );
          });

          // al llegar al final, la pelota se apaga y el botón principal da un golpe
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

          return () => {
            delete hero.dataset.anim;
            hero.style.removeProperty('--hero-barra');
          };
        },
      );

      return () => mm.revert();
    },
    { scope: raiz },
  );

  return (
    <section className="hero" ref={raiz}>
      <div className="hero__fondo" aria-hidden="true">
        <div className="hero__foto">
          <img src={pasto} alt="" width={1170} height={780} />
        </div>
        <div className="hero__sombra" />
      </div>

      <div className="hero__capa" aria-hidden="true">
        {DATOS.map((d) => (
          <span key={`punto-${d.clase}`} className={`hero__punto ${d.clase}`} />
        ))}
        {DATOS.map((d) => (
          <div key={`dato-${d.clase}`} className={`hero__dato ${d.clase}`}>
            <span>{d.etiqueta}</span>
            <strong>{d.valor}</strong>
          </div>
        ))}
        <div className="hero__bola">
          <span className="hero__bola-sombra" />
          <img className="hero__bola-img" src={pelota} alt="" width={224} height={224} />
        </div>
      </div>

      <div className="hero__in wrap">
        <div className="hero__texto">
          <h1>
            Fichá con datos, no <em>a ojo</em>.
          </h1>
          <p className="hero__lead">
            Compará jugadores por rendimiento y presupuesto, sin necesidad de un analista de datos.
          </p>
          <div className="hero__cta">
            <Link className="btn btn--oro btn--lg" to={destino}>
              {conSesion ? 'Buscar jugadores' : 'Empezar ahora'} <span aria-hidden="true">→</span>
            </Link>
            {!conSesion && (
              <Link className="btn btn--onDark btn--lg" to="/ingresar">
                Ya tengo cuenta
              </Link>
            )}
          </div>
          <ul className="ligas" aria-label="Ligas disponibles">
            {LIGAS.map((liga) => (
              <li className="liga" key={liga}>
                {liga}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
