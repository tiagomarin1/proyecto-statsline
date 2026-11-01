import { Link } from 'react-router-dom';

import type { JugadorResumen } from '../tipos/api';
import { formatearEur, POSICIONES } from '../utilidades/formato';
import Dato from './Dato';

interface Props {
  jugador: JugadorResumen;
  /** Query de la búsqueda, para que la ficha calcule la coincidencia. */
  filtros?: string;
  onAlternarSeguimiento: (jugador: JugadorResumen) => void;
  /** Si se pasa, la card muestra el check para elegirlo en la comparación (CMP-001). */
  seleccionado?: boolean;
  onAlternarSeleccion?: (jugador: JugadorResumen) => void;
}

/** Card de jugador: la usan los resultados de búsqueda y la lista de seguimiento. */
export default function TarjetaJugador({
  jugador: j,
  filtros = '',
  onAlternarSeguimiento,
  seleccionado,
  onAlternarSeleccion,
}: Props) {
  return (
    <article className="card pcard">
      <div className="pcard__top">
        <div className="who">
          <b>{j.nombre}</b>
          <span>
            {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} ·{' '}
            {j.edad !== null ? `${j.edad} años` : 'Edad no disponible'}
          </span>
          <span>
            {j.equipo} · {j.liga.nombre}{' '}
            {j.liga.cobertura === 'basica' && (
              <span className="chip chip--warn">Datos básicos</span>
            )}
          </span>
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
      </div>
      <div className="pcard__mx">
        <div className="pcard__m">
          <span>Pases</span>
          <b>
            <Dato valor={j.pases_precision_pct} sufijo="%" />
          </b>
        </div>
        <div className="pcard__m">
          <span>Duelos</span>
          <b>
            <Dato valor={j.duelos_ganados_pct} sufijo="%" />
          </b>
        </div>
        <div className="pcard__m">
          <span>Recup.</span>
          <b>
            <Dato valor={j.recuperaciones_por_partido} />
          </b>
        </div>
        <div className="pcard__m">
          <span>Valor</span>
          <b>
            {j.valor_mercado_eur !== null ? (
              formatearEur(j.valor_mercado_eur)
            ) : (
              <Dato valor={null} />
            )}
          </b>
        </div>
      </div>
      <div className="pcard__foot">
        {onAlternarSeleccion && (
          <label
            style={{
              display: 'inline-flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={seleccionado ?? false}
              onChange={() => onAlternarSeleccion(j)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            Comparar
          </label>
        )}
        <Link
          className="btn btn--ghost btn--sm"
          to={`/ficha/${j.id}${filtros ? `?${filtros}` : ''}`}
        >
          Ver ficha
        </Link>
      </div>
    </article>
  );
}
