import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import BarraFiltros from '../componentes/BarraFiltros';
import BarraSeleccion from '../componentes/BarraSeleccion';
import PanelJugador from '../componentes/PanelJugador';
import Paginacion from '../componentes/Paginacion';
import TablaJugadores from '../componentes/TablaJugadores';
import TarjetaJugador from '../componentes/TarjetaJugador';
import { useAvisar } from '../contexto/AvisosContext';
import { buscarJugadores, listarLigas } from '../servicios/jugadores';
import { ErrorApi } from '../servicios/api';
import { alternarSeguimiento } from '../servicios/seguimiento';
import type { JugadorResumen, Liga, OrdenBusqueda, RespuestaBusqueda } from '../tipos/api';
import { ETIQUETAS_FILTRO, ORDENES, TAMANO_TABLA, TAMANO_TARJETAS } from '../utilidades/filtros';
import { usePantallaChica } from '../utilidades/pantalla';

/** Un 422 trae un mensaje por campo; se muestra con la etiqueta del filtro, no el genérico. */
function mensajeDeError(e: unknown) {
  if (!(e instanceof ErrorApi)) return 'No pudimos conectar con el servidor.';
  if (!e.errores?.length) return e.message;
  return e.errores.map((x) => `${ETIQUETAS_FILTRO[x.campo] ?? x.campo}: ${x.mensaje}`).join(' ');
}

const MAX_COMPARAR = 3;

/** Los filtros viven en la URL: se pueden compartir y sobreviven al "volver" desde la ficha. */
export default function Buscar() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const pantallaChica = usePantallaChica();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Selección para comparar (CMP-001). Guarda el jugador entero para que la barra lo muestre
  // aunque cambie de página de resultados.
  const [seleccion, setSeleccion] = useState<JugadorResumen[]>([]);
  // Jugador cuyo detalle está abierto en el panel (UI-002)
  const [elegidoId, setElegidoId] = useState<number | null>(null);

  const orden = (params.get('orden') as OrdenBusqueda | null) ?? 'minutos';
  const elegido = respuesta?.resultados.find((j) => j.id === elegidoId) ?? null;

  useEffect(() => {
    listarLigas()
      .then(setLigas)
      .catch(() => setLigas([]));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    // El tamaño de página no es un filtro: no va en la URL, solo en el pedido
    const consulta = new URLSearchParams(params);
    consulta.set('tamano', String(pantallaChica ? TAMANO_TARJETAS : TAMANO_TABLA));
    buscarJugadores(consulta)
      .then((r) => vigente && setRespuesta(r))
      .catch((e) => {
        if (!vigente) return;
        // Sin esto quedaban a la vista los resultados de la búsqueda anterior, debajo del error
        setRespuesta(null);
        setError(mensajeDeError(e));
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [params, pantallaChica]);

  // Si el jugador del panel ya no está en la lista (cambió un filtro o el orden), se cierra
  useEffect(() => {
    if (elegidoId !== null && respuesta && !elegido) setElegidoId(null);
  }, [elegidoId, respuesta, elegido]);

  useEffect(() => {
    if (elegidoId === null) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElegidoId(null);
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [elegidoId]);

  /** Aplica los filtros que llegan y conserva el orden; siempre vuelve a la página 1. */
  function aplicarFiltros(filtros: Record<string, string>) {
    const nuevos = new URLSearchParams(filtros);
    if (params.get('orden')) nuevos.set('orden', params.get('orden')!);
    setParams(nuevos);
  }

  function cambiar(clave: string, valor: string | null) {
    const nuevos = new URLSearchParams(params);
    if (valor === null) nuevos.delete(clave);
    else nuevos.set(clave, valor);
    if (clave !== 'pagina') nuevos.delete('pagina');
    setParams(nuevos);
  }

  async function alternar(j: JugadorResumen) {
    try {
      avisar(await alternarSeguimiento(j));
      setRespuesta(
        (r) =>
          r && {
            ...r,
            resultados: r.resultados.map((x) =>
              x.id === j.id ? { ...x, en_seguimiento: !x.en_seguimiento } : x,
            ),
          },
      );
    } catch {
      avisar('No se pudo actualizar la lista de seguimiento.');
    }
  }

  function alternarSeleccion(j: JugadorResumen) {
    if (seleccion.some((s) => s.id === j.id)) {
      setSeleccion(seleccion.filter((s) => s.id !== j.id));
      return;
    }
    if (seleccion.length >= MAX_COMPARAR) {
      avisar(`Se pueden comparar hasta ${MAX_COMPARAR} jugadores a la vez.`);
      return;
    }
    setSeleccion([...seleccion, j]);
  }

  function compararSeleccion() {
    navegar(`/comparar?ids=${seleccion.map((s) => s.id).join(',')}`);
  }

  const filtrosSinPaginado = new URLSearchParams(params);
  filtrosSinPaginado.delete('pagina');
  filtrosSinPaginado.delete('orden');

  return (
    <div className="wrap app">
      <div className="app__head">
        <div>
          <h1>Buscar jugadores</h1>
          <p>Definí el perfil que necesita tu plantel y revisá a los candidatos que lo cumplen.</p>
        </div>
      </div>

      <BarraFiltros params={params} ligas={ligas} onCambiar={aplicarFiltros} />

      <div className="results">
        <div className="results__bar">
          <div>
            <h2>Candidatos</h2>
            {respuesta && <p className="results__meta num">{respuesta.total} resultados</p>}
          </div>
          {pantallaChica && (
            <label className="results__sort">
              Ordenar por
              <select
                className="input"
                value={orden}
                onChange={(e) => cambiar('orden', e.target.value)}
              >
                {Object.entries(ORDENES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && (
          <div className="alert" role="alert">
            <span className="alert__i">!</span>
            <span>{error}</span>
          </div>
        )}

        {respuesta && (
          <>
            {respuesta.liga_sin_datos && (
              <div className="alert alert--warn">
                <span className="alert__i">i</span>
                <span>
                  Esa liga no está cubierta por nuestra fuente de datos. Elegí otra para seguir.
                </span>
              </div>
            )}
            {respuesta.excluidos_por_dato_faltante > 0 && (
              <div className="alert alert--info">
                <span className="alert__i">i</span>
                <span>
                  {respuesta.excluidos_por_dato_faltante} jugador(es) quedaron afuera porque su liga
                  no publica alguna métrica por la que filtrás.
                </span>
              </div>
            )}
            {respuesta.excluidos_sin_valor > 0 && (
              <div className="alert alert--info">
                <span className="alert__i">i</span>
                <span>
                  {respuesta.excluidos_sin_valor} jugador(es) quedaron afuera por no tener valor de
                  mercado publicado.
                </span>
              </div>
            )}

            {respuesta.total === 0 ? (
              <div className="card empty">
                <h3>No hay jugadores que cumplan estos filtros</h3>
                {respuesta.sugerencia && (
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={() => cambiar(respuesta.sugerencia!.filtro, null)}
                  >
                    Relajar {respuesta.sugerencia.etiqueta}
                  </button>
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => setParams({})}
                >
                  Limpiar todos los filtros
                </button>
              </div>
            ) : (
              <>
                {/* Mientras llegan los resultados nuevos se siguen viendo los anteriores, atenuados */}
                <div className={`cuerpo${cargando ? ' is-cargando' : ''}`} aria-busy={cargando}>
                  {pantallaChica ? (
                    <div className="follow">
                      {respuesta.resultados.map((j) => (
                        <TarjetaJugador
                          key={j.id}
                          jugador={j}
                          filtros={params.toString()}
                          onAlternarSeguimiento={alternar}
                          seleccionado={seleccion.some((s) => s.id === j.id)}
                          onAlternarSeleccion={alternarSeleccion}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`cuerpo__grilla${elegido ? ' con-panel' : ''}`}>
                      <TablaJugadores
                        jugadores={respuesta.resultados}
                        orden={orden}
                        elegidoId={elegido?.id ?? null}
                        seleccionIds={seleccion.map((s) => s.id)}
                        onOrdenar={(o) => cambiar('orden', o)}
                        onElegir={(j) => setElegidoId(elegidoId === j.id ? null : j.id)}
                        onAlternarSeguimiento={alternar}
                        onAlternarSeleccion={alternarSeleccion}
                      />
                      {elegido && (
                        <PanelJugador
                          jugador={elegido}
                          filtros={params.toString()}
                          onCerrar={() => setElegidoId(null)}
                          onAlternarSeguimiento={alternar}
                        />
                      )}
                    </div>
                  )}
                </div>
                <Paginacion
                  pagina={respuesta.pagina}
                  totalPaginas={Math.ceil(respuesta.total / respuesta.tamano)}
                  onCambiar={(p) => cambiar('pagina', String(p))}
                />
              </>
            )}
          </>
        )}

        {seleccion.length > 0 && (
          <BarraSeleccion
            seleccion={seleccion}
            onQuitar={(id) => setSeleccion(seleccion.filter((s) => s.id !== id))}
            onLimpiar={() => setSeleccion([])}
            onComparar={compararSeleccion}
          />
        )}
      </div>
    </div>
  );
}
