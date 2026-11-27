import { Link } from 'react-router-dom';

import type { JugadorResumen } from '../tipos/api';
import { formatearEur, POSICIONES } from '../utilidades/formato';
import Dato from './Dato';

interface Props {
  jugador: JugadorResumen;
  /** Query de la búsqueda, para que la ficha calcule la coincidencia (RN-012). */
  filtros: string;
  onCerrar: () => void;
  onAlternarSeguimiento: (jugador: JugadorResumen) => void;
}

/** Detalle del jugador elegido en la tabla, para verlo sin salir de la lista. */
export default function PanelJugador({
  jugador: j,
  filtros,
  onCerrar,
  onAlternarSeguimiento,
}: Props) {
  return (
    <aside className="card pj" aria-label={`Detalle de ${j.nombre}`}>
      <div className="pj__top">
        <div className="who">
          <b>{j.nombre}</b>
          <span>
            {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} ·{' '}
            {j.edad !== null ? `${j.edad} años` : 'Edad no disponible'}
          </span>
          <span>
            {j.equipo} · {j.liga.nombre}
          </span>
        </div>
        <button className="pj__cerrar" type="button" aria-label="Cerrar detalle" onClick={onCerrar}>
          ×
        </button>
      </div>
      <dl className="pj__mx">
        <div>
          <dt>Pases</dt>
          <dd>
            <Dato valor={j.pases_precision_pct} sufijo="%" />
          </dd>
        </div>
        <div>
          <dt>Duelos ganados</dt>
          <dd>
            <Dato valor={j.duelos_ganados_pct} sufijo="%" />
          </dd>
        </div>
        <div>
          <dt>Recuperaciones por partido</dt>
          <dd>
            <Dato valor={j.recuperaciones_por_partido} />
          </dd>
        </div>
        <div>
          <dt>Rating</dt>
          <dd>
            <Dato valor={j.rating} />
          </dd>
        </div>
        <div>
          <dt>Minutos</dt>
          <dd>
            <Dato valor={j.minutos_jugados} />
          </dd>
        </div>
      </dl>
      <div className="pj__valor">
        <span>Valor de mercado</span>
        <b>
          {j.valor_mercado_eur !== null ? formatearEur(j.valor_mercado_eur) : <Dato valor={null} />}
        </b>
      </div>
      <div className="pj__acts">
        <Link
          className="btn btn--primary btn--sm"
          to={`/ficha/${j.id}${filtros ? `?${filtros}` : ''}`}
        >
          Ver ficha completa
        </Link>
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          aria-pressed={j.en_seguimiento}
          onClick={() => onAlternarSeguimiento(j)}
        >
          {j.en_seguimiento ? 'Quitar de seguimiento' : 'Seguir'}
        </button>
      </div>
    </aside>
  );
}
