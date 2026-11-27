import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import Dato from '../componentes/Dato';
import Esqueleto from '../componentes/Esqueleto';
import FilaMetrica from '../componentes/FilaMetrica';
import BuscadorJugador from '../componentes/BuscadorJugador';
import ProgresoFlujo from '../componentes/ProgresoFlujo';
import RadarComparacion from '../componentes/RadarComparacion';
import { ErrorApi } from '../servicios/api';
import { compararJugadores } from '../servicios/comparaciones';
import { obtenerFicha } from '../servicios/jugadores';
import type { Metricas, RespuestaComparacion } from '../tipos/api';
import {
  diferenciaGrande,
  type Grupo,
  GRUPOS,
  grupoDeMetrica,
  mejorYPeor,
  resumenComparacion,
} from '../utilidades/comparacion';
import { useProgreso, valorAnimado } from '../utilidades/movimiento';
import { linkAResultados } from '../utilidades/persistencia';
import { formatearEur, iniciales, POSICIONES } from '../utilidades/formato';

/** Lee los ids de la URL (?ids=1,2,3) para que la comparación se pueda compartir y recargar. */
function idsDeUrl(params: URLSearchParams): number[] {
  return (params.get('ids') ?? '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export default function Comparar() {
  const [params, setParams] = useSearchParams();
  const ubicacion = useLocation();
  const linkComparacion = `${window.location.origin}${ubicacion.pathname}${ubicacion.search}`;
  const ids = idsDeUrl(params);
  const [datos, setDatos] = useState<RespuestaComparacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [promedios, setPromedios] = useState<(Metricas | null)[]>([]);
  const [ocultos, setOcultos] = useState<number[]>([]);
  const [grupo, setGrupo] = useState<Grupo | 'todas'>('todas');
  const [soloGrandes, setSoloGrandes] = useState(false);
  const [soloCompletas, setSoloCompletas] = useState(false);
  const [vista, setVista] = useState<'barras' | 'radar'>('barras');
  const [mostrarPromedio, setMostrarPromedio] = useState(false);
  const [editando, setEditando] = useState(false);
  const [focoMetrica, setFocoMetrica] = useState<string | null>(null);
  const [focoJugador, setFocoJugador] = useState<number | null>(null);
  const progreso = useProgreso(!cargando);
  // CMP-005: cambiar o sumar un jugador sin volver a Buscar, y copiar el link
  const [buscando, setBuscando] = useState<{ reemplaza: number | null } | null>(null);
  const [copiado, setCopiado] = useState<'si' | 'manual' | null>(null);

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

  // CMP-004: el promedio de la posición (RN-015) sale de la ficha de cada jugador. Si falla, las
  // barras funcionan sin la marca.
  useEffect(() => {
    if (!datos) return;
    let vigente = true;
    setOcultos([]);
    Promise.all(
      datos.jugadores.map((j) =>
        Promise.resolve()
          .then(() => obtenerFicha(String(j.id), new URLSearchParams()))
          .then((f) => f.promedios_posicion)
          .catch(() => null),
      ),
    ).then((r) => vigente && setPromedios(r));
    return () => {
      vigente = false;
    };
  }, [datos]);

  /** La comparación vive en la URL: cambiarla rearma todo y "Atrás" vuelve a la anterior. */
  function cambiarIds(nuevos: number[]) {
    setBuscando(null);
    setParams({ ids: nuevos.join(',') });
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkComparacion);
      setCopiado('si');
      setTimeout(() => setCopiado(null), 3000);
    } catch {
      setCopiado('manual');
    }
  }

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
    return <Esqueleto tipo="comparacion" />;
  }

  if (error || !datos) {
    return (
      <div className="wrap app">
        <div className="alert" role="alert">
          <span className="alert__i">!</span>
          <span>{error || 'No pudimos armar la comparación.'}</span>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <Link className="btn btn--ghost" to={linkAResultados()}>
            Volver a resultados
          </Link>
        </div>
      </div>
    );
  }

  const { jugadores, filas, diferencia_valor_eur, mas_barato_id, aviso_fuentes } = datos;
  const masBarato = jugadores.find((j) => j.id === mas_barato_id);
  const visibles = jugadores.filter((j) => !ocultos.includes(j.id));

  // Sin ocultos manda la API (RN-006); con ocultos se recalcula solo con los visibles (RN-037)
  const filasVisibles = filas.map((fila) =>
    ocultos.length === 0
      ? { fila, mejor: fila.mejor, peor: fila.peor }
      : {
          fila,
          ...mejorYPeor(
            Object.fromEntries(visibles.map((j) => [j.id, fila.valores[jugadores.indexOf(j)]])),
          ),
        },
  );
  const ganadas = visibles.map(
    (j) => [j, filasVisibles.filter((f) => f.mejor.includes(j.id)).length] as const,
  );
  const resumen = resumenComparacion(
    filasVisibles.map((f) => ({ mejor: f.mejor })),
    visibles,
  );

  const filasMostradas = filasVisibles.filter(({ fila }) => {
    const deVisibles = visibles.map((j) => fila.valores[jugadores.indexOf(j)]);
    if (grupo !== 'todas' && grupoDeMetrica(fila.metrica) !== grupo) return false;
    if (soloGrandes && !diferenciaGrande(deVisibles)) return false;
    if (soloCompletas && deVisibles.some((v) => v === null)) return false;
    return true;
  });
  const hayFiltro = grupo !== 'todas' || soloGrandes || soloCompletas;
  const alternar = (id: number) =>
    setOcultos((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const quitarFiltros = () => {
    setGrupo('todas');
    setSoloGrandes(false);
    setSoloCompletas(false);
  };
  const jugadoresFila = (metrica: string) =>
    jugadores.map((j, i) => ({
      id: j.id,
      nombre: j.nombre,
      oculto: ocultos.includes(j.id),
      promedio: promedios[i]?.[metrica as keyof Metricas] ?? null,
    }));

  return (
    <div className="wrap app">
      <ProgresoFlujo paso={3} volverA={linkAResultados()} />
      <div className="app__head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Comparar jugadores</h1>
          <p>Métricas lado a lado</p>
        </div>
      </div>

      {aviso_fuentes && (
        <p className="chip chip--warn cmp__aviso" role="note">
          {aviso_fuentes}
        </p>
      )}

      <div className="cmp">
        <p className="cmp__resumen" aria-live="polite">
          {resumen}
        </p>

        <div
          className="cmp__heads"
          style={{ gridTemplateColumns: `repeat(${jugadores.length}, minmax(0, 1fr))` }}
        >
          {jugadores.map((j) => {
            const oculto = ocultos.includes(j.id);
            return (
              <article
                key={j.id}
                className={`card cmp__head${oculto ? ' is-oculto' : ''}`}
                onMouseEnter={() => setFocoJugador(j.id)}
                onMouseLeave={() => setFocoJugador(null)}
              >
                <span className={`avatar avatar--${j.posicion ?? 'nd'}`} aria-hidden="true">
                  {iniciales(j.nombre)}
                </span>
                <h3>{j.nombre}</h3>
                <p className="pos">
                  {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} ·{' '}
                  {j.edad !== null ? `${j.edad} años` : 'Edad no disponible'}
                </p>
                <p className="pos">
                  {j.equipo}{' '}
                  {j.liga.cobertura === 'basica' && (
                    <span className="chip chip--warn">Datos básicos</span>
                  )}
                </p>
                <b className="val num">
                  {j.valor_mercado_eur !== null ? (
                    formatearEur(j.valor_mercado_eur)
                  ) : (
                    <Dato valor={null} />
                  )}
                </b>
                <Link className="btn btn--ghost btn--sm" to={`/ficha/${j.id}`}>
                  Ver ficha
                </Link>
              </article>
            );
          })}
        </div>

        <div className="cmp__rapido">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-expanded={editando}
            onClick={() => setEditando(!editando)}
          >
            Editar jugadores
          </button>
          {jugadores.length < 3 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setBuscando({ reemplaza: null })}
            >
              Sumar jugador
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={copiarLink}>
            Copiar link
          </button>
          {copiado === 'si' && (
            <span className="chip chip--good" role="status">
              Link copiado
            </span>
          )}
        </div>
        {editando && (
          <ul className="cmp__editar" aria-label="Editar jugadores">
            {jugadores.map((j) => {
              const oculto = ocultos.includes(j.id);
              return (
                <li key={j.id}>
                  <span className="cmp__editar-nombre">{j.nombre}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    aria-label={`Cambiar a ${j.nombre}`}
                    onClick={() => setBuscando({ reemplaza: j.id })}
                  >
                    Cambiar
                  </button>
                  {jugadores.length === 3 && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      aria-label={`Quitar a ${j.nombre}`}
                      onClick={() => cambiarIds(ids.filter((x) => x !== j.id))}
                    >
                      Quitar
                    </button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    className="sw"
                    aria-checked={!oculto}
                    aria-label={`Mostrar a ${j.nombre}`}
                    disabled={!oculto && visibles.length <= 2}
                    onClick={() => alternar(j.id)}
                  >
                    <span className="sw__riel" aria-hidden="true">
                      <span className="sw__bola" />
                    </span>
                    <span aria-hidden="true">{oculto ? 'Oculto' : 'Visible'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {copiado === 'manual' && (
          <label className="cmp__link">
            Link de la comparación
            <input readOnly value={linkComparacion} onFocus={(e) => e.currentTarget.select()} />
          </label>
        )}
        {buscando && (
          <BuscadorJugador
            excluirIds={ids}
            onCerrar={() => setBuscando(null)}
            onElegir={(j) =>
              cambiarIds(
                buscando.reemplaza === null
                  ? [...ids, j.id]
                  : ids.map((x) => (x === buscando.reemplaza ? j.id : x)),
              )
            }
          />
        )}

        <section className="card">
          <div className="cmp__barra">
            <h2 style={{ fontSize: 19 }}>Métrica por métrica</h2>
            <div className="seg" role="radiogroup" aria-label="Vista">
              {(['barras', 'radar'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={vista === v}
                  className={vista === v ? 'is-on' : ''}
                  onClick={() => setVista(v)}
                >
                  {v === 'barras' ? 'Barras' : 'Radar'}
                </button>
              ))}
            </div>
          </div>

          {vista === 'barras' && (
            <div className="cmp__filtros">
              <div className="seg" role="radiogroup" aria-label="Grupo de métricas">
                {GRUPOS.map((g) => (
                  <button
                    key={g.clave}
                    type="button"
                    role="radio"
                    aria-checked={grupo === g.clave}
                    className={grupo === g.clave ? 'is-on' : ''}
                    onClick={() => setGrupo(g.clave)}
                  >
                    {g.etiqueta}
                  </button>
                ))}
              </div>
              <label className="chk">
                <input
                  type="checkbox"
                  checked={soloGrandes}
                  onChange={(e) => setSoloGrandes(e.target.checked)}
                />
                Solo diferencias grandes
              </label>
              <label className="chk">
                <input
                  type="checkbox"
                  checked={soloCompletas}
                  onChange={(e) => setSoloCompletas(e.target.checked)}
                />
                Ocultar métricas sin datos
              </label>
              <label className="chk">
                <input
                  type="checkbox"
                  checked={mostrarPromedio}
                  onChange={(e) => setMostrarPromedio(e.target.checked)}
                />
                Mostrar promedio de la posición
              </label>
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--good)' }} />
                  Mejor
                </span>
                <span>
                  <i style={{ background: 'var(--bad)' }} />
                  Peor
                </span>
                {mostrarPromedio && (
                  <span>
                    <i className="legend__prom" />
                    Promedio de la posición
                  </span>
                )}
              </div>
            </div>
          )}

          {vista === 'radar' ? (
            <RadarComparacion
              filas={filas}
              jugadores={jugadores.map((j) => ({
                id: j.id,
                nombre: j.nombre,
                oculto: ocultos.includes(j.id),
              }))}
            />
          ) : filasMostradas.length === 0 ? (
            <div className="empty cmp__vacio">
              <h3>Ninguna métrica cumple el filtro</h3>
              {hayFiltro && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={quitarFiltros}>
                  Quitar filtros
                </button>
              )}
            </div>
          ) : (
            filasMostradas.map(({ fila, mejor, peor }) => (
              <FilaMetrica
                key={fila.metrica}
                fila={fila}
                jugadores={jugadoresFila(fila.metrica)}
                mejor={mejor}
                peor={peor}
                atenuada={focoMetrica !== null && focoMetrica !== fila.metrica}
                jugadorFoco={focoJugador}
                onFocoMetrica={setFocoMetrica}
                mostrarPromedio={mostrarPromedio}
              />
            ))
          )}
        </section>

        <div className="verdict">
          <article className="card vcard" aria-label="Métricas ganadas">
            <span>Métricas ganadas</span>
            <ul className="vcard__lista">
              {ganadas.map(([j, n]) => (
                <li key={j.id}>
                  <span>{j.nombre}</span>
                  <b className="num">{valorAnimado(n, progreso)}</b>
                </li>
              ))}
            </ul>
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
          <Link className="btn btn--ghost" to={linkAResultados()}>
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
