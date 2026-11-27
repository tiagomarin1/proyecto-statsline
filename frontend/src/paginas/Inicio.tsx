import { Link } from 'react-router-dom';

import DemoGuiada from '../componentes/DemoGuiada';
import { HeroLinea } from '../componentes/HeroLinea';
import PorQueStatsline from '../componentes/PorQueStatsline';
import { useSesion } from '../contexto/SesionContext';

/** Home pública: hero con la pelota que recorre la línea (UI-003), "Por qué StatsLine" con mini
 *  demos y "Cómo funciona" como demo guiada (UI-014), y CTA final. */
export default function Inicio() {
  const { usuario } = useSesion();
  const destino = usuario ? '/buscar' : '/registro';

  return (
    <>
      <HeroLinea conSesion={Boolean(usuario)} destino={destino} />

      <PorQueStatsline />
      <DemoGuiada />

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
