import type { JugadorResumen, OrdenBusqueda } from '../tipos/api';
import { formatearEur, POSICIONES } from '../utilidades/formato';
import Dato from './Dato';

type Sentido = 'ascending' | 'descending';

interface Columna {
  titulo: string;
  /** Si es null, el backend no ordena por esta columna y el encabezado no es clicable. */
  orden: OrdenBusqueda | null;
  sentido?: Sentido;
  clase?: string;
}

// RN-021: minutos, pases y rating van de mayor a menor; valor y edad, de menor a mayor.
const COLUMNAS: Columna[] = [
  { titulo: 'Edad', orden: 'edad', sentido: 'ascending' },
  { titulo: 'Min.', orden: 'minutos', sentido: 'descending' },
  { titulo: 'Pases', orden: 'pases', sentido: 'descending' },
  { titulo: 'Duelos', orden: null, clase: 'tj__opc' },
  { titulo: 'Recup.', orden: null, clase: 'tj__opc' },
  { titulo: 'Rating', orden: 'rating', sentido: 'descending', clase: 'tj__opc' },
  { titulo: 'Valor', orden: 'valor', sentido: 'ascending' },
];

interface Props {
  jugadores: JugadorResumen[];
  orden: OrdenBusqueda;
  elegidoId: number | null;
  seleccionIds: number[];
  onOrdenar: (orden: OrdenBusqueda) => void;
  onElegir: (jugador: JugadorResumen) => void;
  onAlternarSeguimiento: (jugador: JugadorResumen) => void;
  onAlternarSeleccion: (jugador: JugadorResumen) => void;
}

/** Candidatos en una fila cada uno, para compararlos de un vistazo. Los datos que la liga no
 *  publica se ven como "N/D" y nunca como 0 (RN-008). */
export default function TablaJugadores({
  jugadores,
  orden,
  elegidoId,
  seleccionIds,
  onOrdenar,
  onElegir,
  onAlternarSeguimiento,
  onAlternarSeleccion,
}: Props) {
  return (
    <div className="tj__caja">
      <table className="tj">
        <thead>
          <tr>
            <th scope="col" className="tj__jugador">
              Jugador
            </th>
            {COLUMNAS.map((c) => {
              const activa = c.orden !== null && c.orden === orden;
              return (
                <th
                  key={c.titulo}
                  scope="col"
                  className={`tj__num ${c.clase ?? ''}`}
                  aria-sort={activa ? c.sentido : undefined}
                >
                  {c.orden ? (
                    <button
                      className={`tj__orden${activa ? ' is-activa' : ''}`}
                      type="button"
                      aria-label={`Ordenar por ${c.titulo}`}
                      onClick={() => onOrdenar(c.orden!)}
                    >
                      {c.titulo}
                      <span aria-hidden="true">
                        {activa ? (c.sentido === 'ascending' ? ' ↑' : ' ↓') : ''}
                      </span>
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              );
            })}
            <th scope="col" className="tj__acc">
              <span className="sr-only">Seguir</span>
            </th>
            <th scope="col" className="tj__acc">
              <span className="sr-only">Comparar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j) => (
            <tr
              key={j.id}
              className={`tj__fila${elegidoId === j.id ? ' is-elegida' : ''}`}
              onClick={() => onElegir(j)}
            >
              <td className="tj__jugador">
                <button
                  className="tj__nombre"
                  type="button"
                  aria-label={`Ver detalle de ${j.nombre}`}
                  aria-expanded={elegidoId === j.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onElegir(j);
                  }}
                >
                  {j.nombre}
                </button>
                <span className="tj__sub">
                  {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} · {j.equipo} ·{' '}
                  {j.liga.nombre}
                  {j.liga.cobertura === 'basica' && (
                    <span className="chip chip--warn">Datos básicos</span>
                  )}
                </span>
              </td>
              <td className="tj__num">
                <Dato valor={j.edad} corto />
              </td>
              <td className="tj__num">
                <Dato valor={j.minutos_jugados} corto />
              </td>
              <td className="tj__num">
                <Dato valor={j.pases_precision_pct} sufijo="%" corto />
              </td>
              <td className="tj__num tj__opc">
                <Dato valor={j.duelos_ganados_pct} sufijo="%" corto />
              </td>
              <td className="tj__num tj__opc">
                <Dato valor={j.recuperaciones_por_partido} corto />
              </td>
              <td className="tj__num tj__opc">
                <Dato valor={j.rating} corto />
              </td>
              <td className="tj__num">
                {j.valor_mercado_eur !== null ? (
                  formatearEur(j.valor_mercado_eur)
                ) : (
                  <Dato valor={null} corto />
                )}
              </td>
              <td className="tj__acc">
                <button
                  className="fav"
                  type="button"
                  aria-pressed={j.en_seguimiento}
                  aria-label={
                    j.en_seguimiento
                      ? `Quitar a ${j.nombre} de la lista de seguimiento`
                      : `Guardar a ${j.nombre} en la lista de seguimiento`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onAlternarSeguimiento(j);
                  }}
                >
                  ★
                </button>
              </td>
              <td className="tj__acc">
                <input
                  type="checkbox"
                  aria-label={`Comparar a ${j.nombre}`}
                  checked={seleccionIds.includes(j.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onAlternarSeleccion(j)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
