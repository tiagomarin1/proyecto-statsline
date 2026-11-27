import { Link } from 'react-router-dom';

import type { JugadorResumen } from '../tipos/api';
import { formatearEur, iniciales, POSICIONES } from '../utilidades/formato';
import Dato from './Dato';

interface Props {
  jugador: JugadorResumen;
  /** Query de la búsqueda, para que la ficha calcule la coincidencia. */
  filtros?: string;
  onAlternarSeguimiento: (jugador: JugadorResumen) => void;
  /** Si se pasa, la tarjeta muestra la casilla para elegirlo en la comparación (CMP-001). */
  seleccionado?: boolean;
  onAlternarSeleccion?: (jugador: JugadorResumen) => void;
}

/** Una métrica en porcentaje: el número y una barra que lo muestra (de 0 a 100 %). Sin dato, la
 *  barra queda vacía (RN-008). */
function MetricaPct({ etiqueta, valor }: { etiqueta: string; valor: number | null }) {
  return (
    <div className="pcard__m">
      <dt>{etiqueta}</dt>
      <dd>
        <Dato valor={valor} sufijo="%" />
      </dd>
      <span className="pcard__barra" aria-hidden="true">
        <i style={{ width: `${valor === null ? 0 : Math.min(100, Math.max(0, valor))}%` }} />
      </span>
    </div>
  );
}

/** Tarjeta de jugador (UI-010): la usan los resultados de búsqueda y la lista de seguimiento. */
export default function TarjetaJugador({
  jugador: j,
  filtros = '',
  onAlternarSeguimiento,
  seleccionado,
  onAlternarSeleccion,
}: Props) {
  return (
    <article className={`card pcard${seleccionado ? ' is-sel' : ''}`}>
      <header className="pcard__cab">
        <span className={`avatar avatar--${j.posicion ?? 'nd'}`} aria-hidden="true">
          {iniciales(j.nombre)}
        </span>
        <div className="pcard__quien">
          <h3 className="pcard__nombre">{j.nombre}</h3>
          <p className="pcard__sub">
            {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} ·{' '}
            {j.edad !== null ? `${j.edad} años` : 'Edad no disponible'}
          </p>
          <p className="pcard__club">
            {j.equipo} · {j.liga.nombre}{' '}
            {j.liga.cobertura === 'basica' && (
              <span className="chip chip--warn">Datos básicos</span>
            )}
          </p>
        </div>
        <button
          className="fav"
          type="button"
          aria-pressed={j.en_seguimiento}
          aria-label={
            j.en_seguimiento
              ? 'Quitar de la lista de seguimiento'
              : 'Guardar en la lista de seguimiento'
          }
          onClick={() => onAlternarSeguimiento(j)}
        >
          ★
        </button>
      </header>

      <div className="pcard__kpis">
        <div className="pcard__kpi pcard__kpi--valor">
          <span>Valor de mercado</span>
          <b>
            {j.valor_mercado_eur !== null ? (
              formatearEur(j.valor_mercado_eur)
            ) : (
              <Dato valor={null} />
            )}
          </b>
        </div>
        <div className="pcard__kpi">
          <span>Rating</span>
          <b>
            <Dato valor={j.rating} />
          </b>
        </div>
      </div>

      <dl className="pcard__mx">
        <div className="pcard__m">
          <dt>Minutos</dt>
          <dd>
            <Dato valor={j.minutos_jugados} />
          </dd>
        </div>
        <MetricaPct etiqueta="% pases" valor={j.pases_precision_pct} />
        <MetricaPct etiqueta="% duelos" valor={j.duelos_ganados_pct} />
        <div className="pcard__m">
          <dt>Recuperaciones</dt>
          <dd>
            <Dato valor={j.recuperaciones_por_partido} />
          </dd>
        </div>
      </dl>

      <footer className="pcard__foot">
        {onAlternarSeleccion && (
          <label className="pcard__cmp">
            <input
              type="checkbox"
              aria-label={`Comparar a ${j.nombre}`}
              checked={seleccionado ?? false}
              onChange={() => onAlternarSeleccion(j)}
            />
            <span>Comparar</span>
          </label>
        )}
        <Link
          className="btn btn--primary btn--sm"
          to={`/ficha/${j.id}${filtros ? `?${filtros}` : ''}`}
        >
          Ver ficha
        </Link>
      </footer>
    </article>
  );
}
