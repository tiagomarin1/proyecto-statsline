import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import BarraSeleccion from '../componentes/BarraSeleccion';
import Paginacion from '../componentes/Paginacion';
import TarjetaJugador from '../componentes/TarjetaJugador';
import { useAvisar } from '../contexto/AvisosContext';
import { buscarJugadores, listarLigas } from '../servicios/jugadores';
import { ErrorApi } from '../servicios/api';
import { alternarSeguimiento } from '../servicios/seguimiento';
import type { JugadorResumen, Liga, OrdenBusqueda, RespuestaBusqueda } from '../tipos/api';
import { POSICIONES } from '../utilidades/formato';

const ORDENES: Record<OrdenBusqueda, string> = {
  minutos: 'Minutos jugados',
  valor: 'Valor (menor primero)',
  edad: 'Edad (menor primero)',
  pases: '% pases completados',
  rating: 'Rating',
};

const METRICAS = [
  { nombre: 'pases_min', label: '% pases completados (mín.)' },
  { nombre: 'duelos_min', label: 'Duelos ganados % (mín.)' },
  { nombre: 'recuperaciones_min', label: 'Recuperaciones por partido (mín.)' },
  { nombre: 'minutos_min', label: 'Minutos jugados (mín.)' },
];

const MAX_COMPARAR = 3;

/** Los filtros viven en la URL: se pueden compartir y sobreviven al "volver" desde la ficha. */
export default function Buscar() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Selección para comparar (CMP-001). Guarda el jugador entero para que la barra lo muestre
  // aunque cambie de página de resultados.
  const [seleccion, setSeleccion] = useState<JugadorResumen[]>([]);

  useEffect(() => {
    listarLigas()
      .then(setLigas)
      .catch(() => setLigas([]));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    buscarJugadores(params)
      .then((r) => vigente && setRespuesta(r))
      .catch(
        (e) =>
          vigente &&
          setError(e instanceof ErrorApi ? e.message : 'No pudimos conectar con el servidor.'),
      )
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [params]);

  function aplicar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nuevos = new URLSearchParams();
    new FormData(e.currentTarget).forEach((valor, clave) => {
      if (String(valor).trim() !== '') nuevos.set(clave, String(valor));
    });
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
      <div className="cols">
        {/* key: al limpiar o relajar desde afuera, el form se vuelve a montar con los valores de la URL */}
        <form
          key={params.toString()}
          className="card filters"
          aria-label="Filtros de búsqueda"
          onSubmit={aplicar}
        >
          <h2>Filtros</h2>
          <div className="filters__grp">
            <label className="filters__legend" htmlFor="posicion">
              Posición
            </label>
            <select
              className="input"
              id="posicion"
              name="posicion"
              defaultValue={params.get('posicion') ?? ''}
            >
              <option value="">Todas</option>
              {Object.entries(POSICIONES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="filters__grp">
            <label className="filters__legend" htmlFor="liga_id">
              Liga
            </label>
            <select
              className="input"
              id="liga_id"
              name="liga_id"
              defaultValue={params.get('liga_id') ?? ''}
            >
              <option value="">Todas</option>
              {ligas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="filters__grp">
            <span className="filters__legend">Edad</span>
            <div className="metric" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input
                className="input"
                name="edad_min"
                type="number"
                min={15}
                max={45}
                placeholder="Desde"
                aria-label="Edad mínima"
                defaultValue={params.get('edad_min') ?? ''}
              />
              <input
                className="input"
                name="edad_max"
                type="number"
                min={15}
                max={45}
                placeholder="Hasta"
                aria-label="Edad máxima"
                defaultValue={params.get('edad_max') ?? ''}
              />
            </div>
          </div>
          <div className="filters__grp">
            <label className="filters__legend" htmlFor="presupuesto_max_eur">
              Presupuesto máximo (EUR)
            </label>
            <input
              className="input"
              id="presupuesto_max_eur"
              name="presupuesto_max_eur"
              type="number"
              min={0}
              step={1000}
              defaultValue={params.get('presupuesto_max_eur') ?? ''}
            />
          </div>
          <div className="filters__grp">
            <span className="filters__legend">Métricas tácticas</span>
            {METRICAS.map((m) => (
              <div key={m.nombre} className="metric">
                <label htmlFor={m.nombre}>{m.label}</label>
                <input
                  className="input"
                  id={m.nombre}
                  name={m.nombre}
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={params.get(m.nombre) ?? ''}
                />
              </div>
            ))}
          </div>
          <div className="filters__acts">
            <button className="btn btn--primary" type="submit">
              Aplicar filtros
            </button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setParams({})}>
              Limpiar
            </button>
          </div>
        </form>

        <div className="results">
          <div className="results__bar">
            <div>
              <h2>Candidatos</h2>
              {respuesta && <p className="results__meta num">{respuesta.total} resultados</p>}
            </div>
            <label className="results__sort">
              Ordenar por
              <select
                className="input"
                value={params.get('orden') ?? 'minutos'}
                onChange={(e) => cambiar('orden', e.target.value)}
              >
                {Object.entries(ORDENES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="alert" role="alert">
              <span className="alert__i">!</span>
              <span>{error}</span>
            </div>
          )}
          {cargando && <p className="muted">Buscando…</p>}

          {!cargando && respuesta && (
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
                    {respuesta.excluidos_por_dato_faltante} jugador(es) quedaron afuera porque su
                    liga no publica alguna métrica por la que filtrás.
                  </span>
                </div>
              )}
              {respuesta.excluidos_sin_valor > 0 && (
                <div className="alert alert--info">
                  <span className="alert__i">i</span>
                  <span>
                    {respuesta.excluidos_sin_valor} jugador(es) quedaron afuera por no tener valor
                    de mercado publicado.
                  </span>
                </div>
              )}

              {respuesta.total === 0 ? (
                <div className="card empty">
                  <h3>No hay jugadores que cumplan estos filtros</h3>
                  {respuesta.sugerencia && (
                    <>
                      <p>
                        Si relajás <b>{respuesta.sugerencia.etiqueta}</b> aparecen{' '}
                        {respuesta.sugerencia.cantidad} candidatos.
                      </p>
                      <button
                        className="btn btn--primary"
                        type="button"
                        onClick={() => cambiar(respuesta.sugerencia!.filtro, null)}
                      >
                        Relajar {respuesta.sugerencia.etiqueta}
                      </button>
                    </>
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
                  <div className="follow">
                    {respuesta.resultados.map((j) => (
                      <TarjetaJugador
                        key={j.id}
                        jugador={j}
                        filtros={filtrosSinPaginado.toString()}
                        onAlternarSeguimiento={alternar}
                        seleccionado={seleccion.some((s) => s.id === j.id)}
                        onAlternarSeleccion={alternarSeleccion}
                      />
                    ))}
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
    </div>
  );
}
