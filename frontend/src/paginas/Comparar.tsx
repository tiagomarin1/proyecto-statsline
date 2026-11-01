import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Dato from '../componentes/Dato';
import { ErrorApi } from '../servicios/api';
import { compararJugadores } from '../servicios/comparaciones';
import type { RespuestaComparacion } from '../tipos/api';
import { formatearEur, POSICIONES } from '../utilidades/formato';

const LETRAS = ['A', 'B', 'C'];

/** Lee los ids de la URL (?ids=1,2,3) para que la comparación se pueda compartir y recargar. */
function idsDeUrl(params: URLSearchParams): number[] {
  return (params.get('ids') ?? '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export default function Comparar() {
  const [params] = useSearchParams();
  const ids = idsDeUrl(params);
  const [datos, setDatos] = useState<RespuestaComparacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const clave = ids.join(',');
  useEffect(() => {
    if (ids.length < 2) {
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError('');
    compararJugadores(ids)
      .then((r) => vigente && setDatos(r))
      .catch(
        (e) =>
          vigente &&
          setError(e instanceof ErrorApi ? e.message : 'No pudimos armar la comparación.'),
      )
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  if (ids.length < 2) {
    return (
      <div className="wrap app">
        <div className="card empty">
          <h3>Elegí al menos dos jugadores</h3>
          <p>
            La comparación se arma desde la búsqueda: marcá 2 o 3 candidatos con “Comparar” y tocá
            el botón.
          </p>
          <Link className="btn btn--primary" to="/buscar">
            Ir a buscar jugadores
          </Link>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="wrap app">
        <p className="muted">Armando la comparación…</p>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="wrap app">
        <div className="alert" role="alert">
          <span className="alert__i">!</span>
          <span>{error || 'No pudimos armar la comparación.'}</span>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <Link className="btn btn--ghost" to="/buscar">
            Volver a resultados
          </Link>
        </div>
      </div>
    );
  }

  const { jugadores, filas, metricas_ganadas, diferencia_valor_eur, mas_barato_id } = datos;
  const masBarato = jugadores.find((j) => j.id === mas_barato_id);
  const temporadas = [...new Set(jugadores.map((j) => j.temporada))];
  const subtitulo =
    temporadas.length === 1 ? `Temporada ${temporadas[0]}` : 'Temporada vigente de cada jugador';

  return (
    <div className="wrap app">
      <div className="app__head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Comparar jugadores</h1>
          <p>Métricas lado a lado · {subtitulo}</p>
        </div>
      </div>

      <div className="cmp">
        <div
          className="cmp__heads"
          style={{ gridTemplateColumns: `repeat(${jugadores.length}, minmax(0, 1fr))` }}
        >
          {jugadores.map((j, i) => (
            <article key={j.id} className="card cmp__head">
              <span className="k">Jugador {LETRAS[i]}</span>
              <h3>{j.nombre}</h3>
              <p className="pos">
                {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} · {j.equipo}
              </p>
              <p className="pos">
                {j.liga.nombre} · Temporada {j.temporada} ·{' '}
                {j.edad !== null ? `${j.edad} años` : 'Edad no disponible'}{' '}
                {j.liga.cobertura === 'basica' && (
                  <span className="chip chip--warn">Datos básicos</span>
                )}
              </p>
              <div className="val">
                <span className="muted" style={{ fontSize: 13 }}>
                  Valor
                </span>
                <br />
                <b className="num">
                  {j.valor_mercado_eur !== null ? (
                    formatearEur(j.valor_mercado_eur)
                  ) : (
                    <Dato valor={null} />
                  )}
                </b>
              </div>
              <div>
                <Link className="btn btn--ghost btn--sm" to={`/ficha/${j.id}`}>
                  Ver ficha
                </Link>
              </div>
            </article>
          ))}
        </div>

        <section className="card">
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: 19 }}>Métrica por métrica</h2>
            <div className="legend">
              <span>
                <i style={{ background: 'var(--accent)' }} />
                Mejor en la métrica
              </span>
              <span>
                <i style={{ background: 'var(--line-strong)' }} />
                Peor en la métrica
              </span>
            </div>
          </div>

          {filas.map((fila) => {
            const disponibles = fila.valores.filter((v): v is number => v !== null);
            const faltan = fila.valores.length - disponibles.length;
            const tope = disponibles.length ? Math.max(...disponibles) : 0;
            return (
              <div key={fila.metrica} className="mrow">
                <div className="mrow__lbl">
                  {fila.etiqueta}
                  {faltan > 0 && <span className="chip chip--warn">Falta en {faltan}</span>}
                </div>
                <div className="mrow__bars">
                  {jugadores.map((j, i) => {
                    const v = fila.valores[i];
                    const pct = v === null || tope === 0 ? 0 : Math.max(3, (v / tope) * 100);
                    const cls = fila.mejor.includes(j.id)
                      ? ' is-best'
                      : fila.peor.includes(j.id)
                        ? ' is-worst'
                        : '';
                    return (
                      <div key={j.id} className="bar">
                        <span className="bar__who">
                          {LETRAS[i]} · {j.nombre.split(' ')[0]}
                        </span>
                        <div className="bar__track">
                          <div className={`bar__fill${cls}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="bar__v num">
                          <Dato valor={v} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <div className="verdict">
          <article className="card vcard">
            <span>Métricas ganadas</span>
            <b className="num">
              {jugadores
                .map((j, i) => `${LETRAS[i]} ${metricas_ganadas[String(j.id)] ?? 0}`)
                .join(' · ')}
            </b>
            <p>Sobre {filas.length} métricas comparadas.</p>
          </article>
          <article className="card vcard">
            <span>Diferencia de valor</span>
            {diferencia_valor_eur !== null ? (
              <>
                <b className="num">{formatearEur(diferencia_valor_eur)}</b>
                <p>
                  {masBarato
                    ? `${masBarato.nombre} es el más barato de la comparación.`
                    : 'Entre el más caro y el más barato.'}
                </p>
              </>
            ) : (
              <>
                <b className="num">Costo no disponible</b>
                <p>Hacen falta al menos dos jugadores con valor de mercado publicado.</p>
              </>
            )}
          </article>
        </div>

        <div className="actions">
          <Link className="btn btn--ghost" to="/buscar">
            Volver a resultados
          </Link>
          <button className="btn" type="button" disabled>
            Exportar PDF
          </button>
          <span className="chip chip--r2">Exportar PDF entra en el release 2</span>
        </div>
      </div>
    </div>
  );
}
