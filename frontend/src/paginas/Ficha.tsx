import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Dato from '../componentes/Dato';
import Esqueleto from '../componentes/Esqueleto';
import InfoMetrica from '../componentes/InfoMetrica';
import ProgresoFlujo from '../componentes/ProgresoFlujo';
import Trayectoria from '../componentes/Trayectoria';
import { useAvisar } from '../contexto/AvisosContext';
import { ErrorApi } from '../servicios/api';
import { obtenerFicha } from '../servicios/jugadores';
import { alternarSeguimiento } from '../servicios/seguimiento';
import type { FichaJugador, Metricas } from '../tipos/api';
import { formatearEur, formatearNumero, iniciales, POSICIONES } from '../utilidades/formato';
import { resumenDeFicha } from '../utilidades/jugador';
import { usePantallaChica } from '../utilidades/pantalla';

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

/** Escala de la barra de cada métrica: los % a 100, el rating a 10, el resto relativo al
 * valor y al promedio para que ambos entren y se note si está por encima o por debajo. */
function topeMetrica(
  clave: keyof Metricas,
  sufijo: string | undefined,
  valor: number,
  promedio: number | null,
): number {
  if (sufijo === '%') return 100;
  if (clave === 'rating') return 10;
  const base = Math.max(valor, promedio ?? 0);
  return base > 0 ? base * 1.25 : 1;
}

/** UI-010: cuánto está el valor sobre o bajo el promedio de la posición (RN-015). Resta de los dos
 *  valores ya redondeados (RN-018); sin promedio no hay comparación. */
function textoDiferencia(valor: number, promedio: number | null) {
  if (promedio === null) return null;
  const dif = Math.round((valor - promedio) * 100) / 100;
  if (dif === 0) return { texto: 'En el promedio', clase: 'igual' };
  const cuanto = formatearNumero(Math.abs(dif));
  return dif > 0
    ? { texto: `${cuanto} por encima del promedio`, clase: 'sobre' }
    : { texto: `${cuanto} por debajo del promedio`, clase: 'bajo' };
}

export default function Ficha() {
  const { id = '' } = useParams();
  const [filtros] = useSearchParams();
  const navegar = useNavigate();
  const chica = usePantallaChica();
  const [pestana, setPestana] = useState<'metricas' | 'coincidencia' | 'trayectoria'>('metricas');
  const avisar = useAvisar();
  const [ficha, setFicha] = useState<FichaJugador | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // La coincidencia se calcula con los filtros, no con el orden ni el paginado: esos quedan en
    // la URL solo para que "Volver a resultados" devuelva a la misma página y orden.
    const paraCoincidencia = new URLSearchParams(filtros);
    paraCoincidencia.delete('pagina');
    paraCoincidencia.delete('orden');
    paraCoincidencia.delete('ver');
    obtenerFicha(id, paraCoincidencia)
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
  if (!ficha) return <Esqueleto tipo="ficha" />;

  const { metricas, promedios_posicion: promedios, valor_mercado: valor, coincidencia } = ficha;
  // UI-006: en celular cada sección va en su pestaña; en pantalla ancha se ve todo junto
  const ver = (seccion: typeof pestana) => !chica || pestana === seccion;
  const pestanas = [
    { clave: 'metricas', etiqueta: 'Métricas' },
    ...(coincidencia ? [{ clave: 'coincidencia', etiqueta: 'Coincidencia' }] : []),
    { clave: 'trayectoria', etiqueta: 'Trayectoria' },
  ] as { clave: typeof pestana; etiqueta: string }[];
  const moverPestana = (e: React.KeyboardEvent, i: number) => {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (paso) setPestana(pestanas[(i + paso + pestanas.length) % pestanas.length].clave);
  };

  return (
    <div className="wrap app">
      {volver}
      <ProgresoFlujo paso={2} volverA={`/buscar?${filtros}`} />
      <div className="ficha">
        <section className="card ficha__hero">
          <div className="ficha__id">
            <span
              className={`avatar avatar--xl avatar--${ficha.posicion ?? 'nd'}`}
              aria-hidden="true"
            >
              {iniciales(ficha.nombre_completo)}
            </span>
            <div>
              <h1>{ficha.nombre_completo}</h1>
              <div className="ficha__meta">
                {ficha.posicion && (
                  <span className="chip chip--accent">{POSICIONES[ficha.posicion]}</span>
                )}
                <span className="chip">{ficha.equipo}</span>
                <span className="chip">{ficha.liga.nombre}</span>
                {ficha.edad !== null && <span className="chip">{ficha.edad} años</span>}
                {ficha.nacionalidad && <span className="chip">{ficha.nacionalidad}</span>}
                {ficha.liga.cobertura === 'basica' && (
                  <span className="chip chip--warn">Datos básicos</span>
                )}
              </div>
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
              className="btn btn--sm btn--ghost"
              type="button"
              onClick={() =>
                navegar(`/buscar?${filtros}`, {
                  state: { comparar: resumenDeFicha(ficha) },
                })
              }
            >
              Comparar con…
            </button>
            <button
              className={`btn btn--sm ${ficha.en_seguimiento ? 'btn--ghost' : 'btn--primary'}`}
              type="button"
              onClick={alternar}
            >
              ★ {ficha.en_seguimiento ? 'Quitar del seguimiento' : 'Guardar en seguimiento'}
            </button>
          </div>
        </section>

        <section className="ficha__kpis" aria-label="Datos clave">
          <div className="ficha__kpi">
            <span>Edad</span>
            <b>{ficha.edad !== null ? `${ficha.edad} años` : <Dato valor={null} />}</b>
          </div>
          <div className="ficha__kpi">
            <span>Minutos</span>
            <b>
              <Dato valor={metricas.minutos_jugados} />
            </b>
          </div>
          <div className="ficha__kpi">
            <span>Rating</span>
            <b>
              <Dato valor={metricas.rating} />
            </b>
          </div>
          <div className="ficha__kpi">
            <span>Partidos</span>
            <b>
              <Dato valor={metricas.partidos_jugados} />
            </b>
          </div>
        </section>

        {chica && (
          <div className="ptabs" role="tablist" aria-label="Secciones de la ficha">
            {pestanas.map((p, i) => (
              <button
                key={p.clave}
                type="button"
                role="tab"
                id={`tab-${p.clave}`}
                aria-selected={pestana === p.clave}
                aria-controls="panel-ficha"
                tabIndex={pestana === p.clave ? 0 : -1}
                onClick={() => setPestana(p.clave)}
                onKeyDown={(e) => moverPestana(e, i)}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        )}

        <div
          className={`ficha__grid${chica ? ' ficha__grid--tab' : ''}`}
          id="panel-ficha"
          role={chica ? 'tabpanel' : undefined}
          aria-labelledby={chica ? `tab-${pestana}` : undefined}
        >
          {ver('metricas') && (
            <section className="card mlist">
              <div className="mlist__cab">
                <h2>Métricas de rendimiento</h2>
                <p className="muted">
                  La barra es el valor del jugador; la marca vertical, el promedio de la posición.
                </p>
              </div>
              <div className="mgrid">
                {METRICAS.map((m) => {
                  const valor = metricas[m.clave];
                  const promedio = promedios[m.clave];
                  const etiqueta = (
                    <span className="mitem__lbl">
                      {m.label}
                      <InfoMetrica metrica={m.clave} etiqueta={m.label} />
                    </span>
                  );
                  if (valor === null) {
                    return (
                      <div key={m.clave} className="mitem mitem--nd">
                        {etiqueta}
                        <b className="mitem__num">
                          <Dato valor={null} />
                        </b>
                        <p className="mitem__foot">{ficha.liga.nombre} no publica esta métrica.</p>
                      </div>
                    );
                  }
                  const tope = topeMetrica(m.clave, m.sufijo, valor, promedio);
                  const dif = textoDiferencia(valor, promedio);
                  return (
                    <div key={m.clave} className="mitem">
                      {etiqueta}
                      <b className="mitem__num">
                        <Dato valor={valor} sufijo={m.sufijo} />
                      </b>
                      <div className="mitem__bar">
                        <div
                          className="mitem__fill"
                          style={{ width: `${Math.min(100, (valor / tope) * 100)}%` }}
                        />
                        {promedio !== null && (
                          <span
                            className="mitem__avg"
                            style={{ left: `${Math.min(99, (promedio / tope) * 100)}%` }}
                          />
                        )}
                      </div>
                      <p className="mitem__foot">
                        {dif && (
                          <span className={`mitem__dif mitem__dif--${dif.clase}`}>{dif.texto}</span>
                        )}
                        {promedio !== null && (
                          <span>
                            Promedio de la posición: <Dato valor={promedio} sufijo={m.sufijo} />
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="ficha__lateral">
            {coincidencia && ver('coincidencia') && (
              <section className="card match">
                <h3>Coincidencia con tu búsqueda</h3>
                <p className="muted">
                  Cumple {coincidencia.cumple} de {coincidencia.total} criterios.
                </p>
                {coincidencia.criterios.map((c) => (
                  <div key={c.criterio} className="match__row">
                    <span className={`match__i match__i--${CLASE[c.estado]}`}>
                      {ICONO[c.estado]}
                    </span>
                    <span>{c.texto}</span>
                  </div>
                ))}
              </section>
            )}
            {ver('trayectoria') && <Trayectoria trayectoria={ficha.trayectoria} />}
          </div>
        </div>
      </div>
    </div>
  );
}
