import { Link } from 'react-router-dom';

const PASOS = ['Buscar', 'Elegir', 'Comparar'];

/** UI-007: dónde está el usuario en el camino Buscar → Elegir → Comparar. Los pasos hechos son
 *  links a los resultados, con los filtros conservados. */
export default function ProgresoFlujo({
  paso,
  volverA = '/buscar',
}: {
  paso: 1 | 2 | 3;
  volverA?: string;
}) {
  return (
    <nav className="flujo" aria-label="Progreso">
      <ol>
        {PASOS.map((nombre, i) => {
          const n = i + 1;
          const hecho = n < paso;
          const actual = n === paso;
          const contenido = (
            <>
              <b aria-hidden="true">{hecho ? '✓' : n}</b>
              <span>{nombre}</span>
            </>
          );
          return (
            <li
              key={nombre}
              className={hecho ? 'is-hecho' : actual ? 'is-actual' : ''}
              aria-current={actual ? 'step' : undefined}
            >
              {hecho ? <Link to={volverA}>{contenido}</Link> : contenido}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
