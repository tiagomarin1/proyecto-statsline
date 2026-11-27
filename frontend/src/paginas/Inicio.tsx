import { Link } from 'react-router-dom';

import { HeroLinea } from '../componentes/HeroLinea';
import { useSesion } from '../contexto/SesionContext';

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

const PASOS = [
  { titulo: 'Buscá', texto: 'Definí el perfil: posición, edad, liga, presupuesto y métricas.' },
  { titulo: 'Elegí 2 o 3', texto: 'Marcá a los candidatos que más te interesan.' },
  { titulo: 'Compará', texto: 'Mirá sus métricas y su costo lado a lado y decidí con datos.' },
];

/** Home pública: hero con la pelota que recorre la línea (UI-003), beneficios y CTA final. */
export default function Inicio() {
  const { usuario } = useSesion();
  const destino = usuario ? '/buscar' : '/registro';

  return (
    <>
      <HeroLinea conSesion={Boolean(usuario)} destino={destino} />

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

      <section className="band band--paso" aria-label="Cómo funciona">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Cómo funciona</span>
            <h2>De la búsqueda a la decisión en tres pasos.</h2>
          </div>
          <ol className="como">
            {PASOS.map((p, i) => (
              <li
                key={p.titulo}
                className="card como__paso"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <b className="como__n" aria-hidden="true">
                  {i + 1}
                </b>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band band--cta">
        <div className="cta__in wrap">
          <h2>Tu próximo refuerzo está en los datos.</h2>
          <Link className="btn btn--oro btn--lg" to={destino}>
            {usuario ? 'Ir a buscar' : 'Crear cuenta gratis'} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
