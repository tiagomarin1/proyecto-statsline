import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import BarraFiltros from '../componentes/BarraFiltros';
import BarraSeleccion from '../componentes/BarraSeleccion';
import PanelJugador from '../componentes/PanelJugador';
import Paginacion from '../componentes/Paginacion';
import TablaJugadores from '../componentes/TablaJugadores';
import TarjetaJugador from '../componentes/TarjetaJugador';
import { useAvisar } from '../contexto/AvisosContext';
import { buscarJugadores, listarLigas } from '../servicios/jugadores';
import { ErrorApi } from '../servicios/api';
import { guardarPerfil, obtenerPerfil } from '../servicios/perfilBusqueda';
import { alternarSeguimiento } from '../servicios/seguimiento';
import type {
  JugadorResumen,
  Liga,
  OrdenBusqueda,
  PerfilBusqueda,
  PerfilBusquedaRequest,
  Posicion,
  RespuestaBusqueda,
} from '../tipos/api';
import {
  ETIQUETAS_FILTRO,
  motivoOrdenNoDisponible,
  NOMBRES_FILTRO,
  ORDENES,
  sinOrdenNoDisponible,
  TAMANO_TABLA,
  TAMANO_TARJETAS,
} from '../utilidades/filtros';
import { POSICIONES } from '../utilidades/formato';
import { usePantallaChica } from '../utilidades/pantalla';

/** Un 422 trae un mensaje por campo; se muestra con la etiqueta del filtro, no el genérico. */
function mensajeDeError(e: unknown) {
  if (!(e instanceof ErrorApi)) return 'No pudimos conectar con el servidor.';
  if (!e.errores?.length) return e.message;
  return e.errores.map((x) => `${ETIQUETAS_FILTRO[x.campo] ?? x.campo}: ${x.mensaje}`).join(' ');
}

const MAX_COMPARAR = 3;

/** Campos obligatorios del perfil (RN-023), como los nombra el 422 del backend. */
const OBLIGATORIOS_PERFIL = ['posicion', 'liga_id', 'edad'];

/** BUS-005: los filtros del formulario como cuerpo del PUT. Lo vacío va en null. */
function perfilDeFiltros(filtros: Record<string, string>): PerfilBusquedaRequest {
  const numero = (nombre: string) =>
    filtros[nombre] === undefined ? null : Number(filtros[nombre]);
  return {
    posicion: (filtros.posicion as Posicion | undefined) ?? null,
    liga_id: numero('liga_id'),
    edad_min: numero('edad_min'),
    edad_max: numero('edad_max'),
    presupuesto_max_eur: numero('presupuesto_max_eur'),
    pases_min: numero('pases_min'),
    duelos_min: numero('duelos_min'),
    recuperaciones_min: numero('recuperaciones_min'),
    minutos_min: numero('minutos_min'),
  };
}

/** "Cargar perfil guardado" copia sus valores a los filtros (RN-023); los null no son filtros. */
function filtrosDePerfil(perfil: PerfilBusqueda): Record<string, string> {
  const filtros: Record<string, string> = {};
  for (const nombre of NOMBRES_FILTRO) {
    // `nombre` (BUS-010) es un filtro pero no es parte del perfil: ahí queda undefined
    const valor = perfil[nombre as keyof PerfilBusqueda] as
      PerfilBusqueda[keyof PerfilBusqueda] | undefined;
    if (valor !== null && valor !== undefined) filtros[nombre] = String(valor);
  }
  return filtros;
}

function resumenDePerfil(perfil: PerfilBusqueda, ligas: Liga[]) {
  const liga = ligas.find((l) => l.id === perfil.liga_id)?.nombre ?? `Liga ${perfil.liga_id}`;
  return `Perfil guardado: ${POSICIONES[perfil.posicion]} · ${perfil.edad_min}-${perfil.edad_max} años · ${liga}`;
}

/** Los filtros viven en la URL: se pueden compartir y sobreviven al "volver" desde la ficha. */
export default function Buscar() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const avisar = useAvisar();
  const pantallaChica = usePantallaChica();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Selección para comparar (CMP-001). Guarda el jugador entero para que la barra lo muestre
  // aunque cambie de página de resultados.
  const [seleccion, setSeleccion] = useState<JugadorResumen[]>([]);
  // CMP-005: "Comparar con…" desde la ficha o el panel llega con el jugador de origen
  const origen = (ubicacion.state as { comparar?: JugadorResumen } | null)?.comparar;
  useEffect(() => {
    if (!origen) return;
    setSeleccion((s) =>
      s.some((x) => x.id === origen.id) ? s : [...s, origen].slice(0, MAX_COMPARAR),
    );
    avisar('Elegí a quién compararlo');
    navegar(`${ubicacion.pathname}${ubicacion.search}`, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen?.id]);
  // Jugador cuyo detalle está abierto en el panel (UI-002)
  const [elegidoId, setElegidoId] = useState<number | null>(null);
  // BUS-005: el perfil guardado (uno por usuario, RN-023) y lo que falta para guardar uno
  const [perfilGuardado, setPerfilGuardado] = useState<PerfilBusqueda | null>(null);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [camposInvalidos, setCamposInvalidos] = useState<string[]>([]);

  const orden = (params.get('orden') as OrdenBusqueda | null) ?? 'minutos';
  const elegido = respuesta?.resultados.find((j) => j.id === elegidoId) ?? null;

  useEffect(() => {
    listarLigas()
      .then(setLigas)
      .catch(() => setLigas([]));
    // Si no se puede leer, la pantalla sigue andando: solo no se ofrece cargarlo
    obtenerPerfil()
      .then(setPerfilGuardado)
      .catch(() => setPerfilGuardado(null));
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

  /** Aplica los filtros que llegan y conserva el orden si sigue disponible (RN-029); siempre
   *  vuelve a la página 1. */
  function aplicarFiltros(filtros: Record<string, string>) {
    // Al tocar los filtros, lo que faltaba para guardar el perfil deja de marcarse
    setErrorPerfil('');
    setCamposInvalidos([]);
    const nuevos = new URLSearchParams(filtros);
    if (params.get('orden')) nuevos.set('orden', params.get('orden')!);
    setParams(sinOrdenNoDisponible(nuevos));
  }

  /** BUS-005: guarda o reemplaza el perfil. Lo obligatorio lo valida el backend (RN-023), que
   *  devuelve el mensaje con todo lo que falta. */
  async function guardarPerfilDeBusqueda(filtros: Record<string, string>) {
    setErrorPerfil('');
    setCamposInvalidos([]);
    const habiaPerfil = perfilGuardado !== null;
    try {
      setPerfilGuardado(await guardarPerfil(perfilDeFiltros(filtros)));
      avisar(
        habiaPerfil
          ? 'Perfil guardado. Reemplaza al anterior: en el MVP hay un solo perfil.'
          : 'Perfil de búsqueda guardado.',
      );
    } catch (e) {
      if (!(e instanceof ErrorApi)) {
        avisar('No se pudo guardar el perfil de búsqueda.');
        return;
      }
      const campos = e.errores?.map((x) => x.campo) ?? [];
      setCamposInvalidos(campos);
      // El 422 de RN-023 ya trae la frase completa; otros 422 (por ejemplo, un rango de edad al
      // revés) se muestran campo por campo, como en la búsqueda
      setErrorPerfil(
        campos.some((c) => OBLIGATORIOS_PERFIL.includes(c)) ? e.message : mensajeDeError(e),
      );
    }
  }

  function cambiar(clave: string, valor: string | null) {
    const nuevos = new URLSearchParams(params);
    if (valor === null) nuevos.delete(clave);
    else nuevos.set(clave, valor);
    if (clave !== 'pagina') nuevos.delete('pagina');
    setParams(sinOrdenNoDisponible(nuevos));
  }

  const ordenesNoDisponibles = Object.fromEntries(
    (Object.keys(ORDENES) as OrdenBusqueda[])
      .map((o) => [o, motivoOrdenNoDisponible(o, params)])
      .filter(([, motivo]) => motivo !== null),
  ) as Partial<Record<OrdenBusqueda, string>>;

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

  /** CMP-005: desde el panel, deja al jugador seleccionado y pide elegir al otro */
  function compararCon(j: JugadorResumen) {
    if (!seleccion.some((s) => s.id === j.id)) {
      if (seleccion.length >= MAX_COMPARAR) {
        avisar(`Se pueden comparar hasta ${MAX_COMPARAR} jugadores a la vez.`);
        return;
      }
      setSeleccion([...seleccion, j]);
    }
    setElegidoId(null);
    avisar('Elegí a quién compararlo');
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

      <BarraFiltros
        params={params}
        ligas={ligas}
        onCambiar={aplicarFiltros}
        onGuardarPerfil={guardarPerfilDeBusqueda}
        onCargarPerfil={
          perfilGuardado ? () => aplicarFiltros(filtrosDePerfil(perfilGuardado)) : undefined
        }
        resumenPerfil={perfilGuardado && resumenDePerfil(perfilGuardado, ligas)}
        errorPerfil={errorPerfil}
        camposInvalidos={camposInvalidos}
      />

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
                {Object.entries(ORDENES)
                  .filter(([v]) => !(v in ordenesNoDisponibles))
                  .map(([v, l]) => (
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
                        ordenesNoDisponibles={ordenesNoDisponibles}
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
                          onCompararCon={compararCon}
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
