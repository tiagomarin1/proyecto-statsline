import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import Dato from '../componentes/Dato';
import { useAvisar } from '../contexto/AvisosContext';
import { ErrorApi } from '../servicios/api';
import { obtenerFicha } from '../servicios/jugadores';
import { alternarSeguimiento } from '../servicios/seguimiento';
import type { FichaJugador, Metricas } from '../tipos/api';
import { formatearEur, POSICIONES } from '../utilidades/formato';

const METRICAS: { clave: keyof Metricas; label: string; sufijo?: string }[] = [
  { clave: 'partidos_jugados', label: 'Partidos jugados' },
  { clave: 'minutos_jugados', label: 'Minutos jugados' },
  { clave: 'goles', label: 'Goles' },
  { clave: 'asistencias', label: 'Asistencias' },
  { clave: 'pases_precision_pct', label: '% pases completados', sufijo: '%' },
  { clave: 'duelos_ganados_pct', label: 'Duelos ganados', sufijo: '%' },
  { clave: 'recuperaciones_por_partido', label: 'Recuperaciones por partido' },
  { clave: 'rating', label: 'Rating' },
];

const ICONO = { cumple: '✓', no_cumple: '×', sin_dato: '?' } as const;
const CLASE = { cumple: 'ok', no_cumple: 'no', sin_dato: 'na' } as const;

export default function Ficha() {
  const { id = '' } = useParams();
  const [filtros] = useSearchParams();
  const avisar = useAvisar();
  const [ficha, setFicha] = useState<FichaJugador | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerFicha(id, filtros)
      .then(setFicha)
      .catch((e) =>
        setError(e instanceof ErrorApi ? e.message : 'No pudimos conectar con el servidor.'),
      );
  }, [id, filtros]);

  async function alternar() {
    if (!ficha) return;
    try {
      avisar(await alternarSeguimiento(ficha));
      setFicha({ ...ficha, en_seguimiento: !ficha.en_seguimiento });
    } catch {
      avisar('No se pudo actualizar la lista de seguimiento.');
    }
  }

  const volver = (
    <div className="app__head">
      <Link className="btn btn--ghost btn--sm" to={`/buscar?${filtros}`}>
        ‹ Volver a resultados
      </Link>
    </div>
  );

  if (error) {
    return (
      <div className="wrap app">
        {volver}
        <div className="card empty">
          <h3>{error}</h3>
        </div>
      </div>
    );
  }
  if (!ficha) return <p className="wrap app muted">Cargando…</p>;

  const { metricas, promedios_posicion: promedios, valor_mercado: valor, coincidencia } = ficha;

  return (
    <div className="wrap app">
      {volver}
      <div className="ficha">
        <section className="card ficha__hero">
          <div>
            <h1>{ficha.nombre}</h1>
            <div className="ficha__meta">
              {ficha.posicion && (
                <span className="chip chip--accent">{POSICIONES[ficha.posicion]}</span>
              )}
              <span className="chip">{ficha.equipo}</span>
              <span className="chip">{ficha.liga.nombre}</span>
              {ficha.edad !== null && <span className="chip">{ficha.edad} años</span>}
              {ficha.nacionalidad && <span className="chip">{ficha.nacionalidad}</span>}
              <span className="chip">Temporada {ficha.temporada}</span>
              {ficha.liga.cobertura === 'basica' && (
                <span className="chip chip--warn">Datos básicos</span>
              )}
            </div>
          </div>
          <div className="ficha__right">
            <div>
              <span className="muted">Valor de referencia</span>
              <div className="ficha__val">
                {valor ? formatearEur(valor.eur) : <Dato valor={null} />}
              </div>
              {valor && (
                <span className="faint">
                  {valor.fuente} · {valor.fecha}
                </span>
              )}
            </div>
            <button
              className={`btn btn--sm ${ficha.en_seguimiento ? 'btn--ghost' : 'btn--primary'}`}
              type="button"
              onClick={alternar}
            >
              ★ {ficha.en_seguimiento ? 'Quitar del seguimiento' : 'Guardar en seguimiento'}
            </button>
          </div>
        </section>

        <div className="ficha__grid">
          <section className="card mlist">
            <h2>Métricas de rendimiento</h2>
            {METRICAS.map((m) => (
              <div key={m.clave} className="mitem">
                <div className="mitem__top">
                  <span>{m.label}</span>
                  <b>
                    <Dato valor={metricas[m.clave]} sufijo={m.sufijo} />
                  </b>
                </div>
                <p className="mitem__foot">
                  Promedio de la posición: <Dato valor={promedios[m.clave]} sufijo={m.sufijo} />
                </p>
              </div>
            ))}
          </section>

          {coincidencia && (
            <section className="card match">
              <h3>Coincidencia con tu búsqueda</h3>
              <p className="muted">
                Cumple {coincidencia.cumple} de {coincidencia.total} criterios.
              </p>
              {coincidencia.criterios.map((c) => (
                <div key={c.criterio} className="match__row">
                  <span className={`match__i match__i--${CLASE[c.estado]}`}>{ICONO[c.estado]}</span>
                  <span>{c.texto}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
