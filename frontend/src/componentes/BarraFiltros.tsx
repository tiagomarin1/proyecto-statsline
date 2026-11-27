import { useEffect, useRef, useState } from 'react';

import type { Liga } from '../tipos/api';
import { filtrosDeParams, METRICAS, NOMBRE_LARGO_MAXIMO } from '../utilidades/filtros';
import { formatearEur, POSICIONES } from '../utilidades/formato';

/** Lo que se espera después de la última tecla antes de pedir los resultados. */
const ESPERA_MS = 350;

interface Props {
  /** La URL de /buscar: es la fuente de verdad de los filtros. */
  params: URLSearchParams;
  ligas: Liga[];
  /** Recibe todos los filtros que quedan activos, sin los vacíos. */
  onCambiar: (filtros: Record<string, string>) => void;
  /** BUS-005: recibe los filtros tal como están en el formulario, aunque falte aplicarlos. */
  onGuardarPerfil?: (filtros: Record<string, string>) => void;
  /** BUS-005: solo llega si hay un perfil guardado. */
  onCargarPerfil?: () => void;
  /** "Perfil guardado: Defensor · 20-27 años · Primera Nacional" */
  resumenPerfil?: string | null;
  /** RN-023: el mensaje de lo que falta para guardar el perfil. */
  errorPerfil?: string;
  /** Campos que se marcan como inválidos (`edad` marca los dos extremos del rango). */
  camposInvalidos?: string[];
  /** UI-006: en celular el formulario va en un panel que sube desde abajo. */
  chica?: boolean;
  /** UI-006: lo que dice el botón del panel: "Ver N resultados". */
  totalResultados?: number | null;
}

/** Etiqueta del chip de un filtro activo. */
function etiquetaChip(nombre: string, valor: string, ligas: Liga[]): string {
  const numero = Number(valor);
  switch (nombre) {
    case 'nombre':
      return `Nombre: ${valor}`;
    case 'posicion':
      return POSICIONES[valor as keyof typeof POSICIONES] ?? valor;
    case 'liga_id':
      return ligas.find((l) => String(l.id) === valor)?.nombre ?? `Liga ${valor}`;
    case 'edad_min':
      return `Edad desde ${valor}`;
    case 'edad_max':
      return `Edad hasta ${valor}`;
    case 'presupuesto_max_eur':
      return `Presupuesto hasta ${Number.isFinite(numero) ? formatearEur(numero) : valor}`;
    case 'pases_min':
      return `Pases desde ${valor}%`;
    case 'duelos_min':
      return `Duelos ganados desde ${valor}%`;
    case 'recuperaciones_min':
      return `Recuperaciones desde ${valor}`;
    case 'minutos_min':
      return `Minutos desde ${valor}`;
    default:
      return `${nombre}: ${valor}`;
  }
}

/** Filtros que se aplican solos: los selectores al instante, y el nombre y los números al dejar
 * de tipear. */
export default function BarraFiltros({
  params,
  ligas,
  onCambiar,
  onGuardarPerfil,
  onCargarPerfil,
  resumenPerfil,
  errorPerfil,
  camposInvalidos = [],
  chica = false,
  totalResultados = null,
}: Props) {
  const [abierta, setAbierta] = useState(false);
  const hoja = useRef<HTMLDivElement>(null);
  const aplicados = filtrosDeParams(params);
  const clave = JSON.stringify(aplicados);
  const [valores, setValores] = useState(aplicados);
  const actuales = useRef(valores);
  const temporizador = useRef<ReturnType<typeof setTimeout>>();

  // Si la URL cambia por otro lado (chip, "Limpiar todo", "Relajar", volver desde la ficha), el
  // formulario la sigue y se cancela lo que estaba pendiente de aplicar.
  useEffect(() => {
    clearTimeout(temporizador.current);
    actuales.current = aplicados;
    setValores(aplicados);
    // `clave` resume `aplicados`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // UI-006: con el panel abierto el foco va a él y la página de atrás no se mueve
  useEffect(() => {
    if (!abierta) return;
    hoja.current?.focus();
    const previo = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previo;
    };
  }, [abierta]);

  function cambiar(nombre: string, valor: string, inmediato: boolean) {
    const nuevos = { ...actuales.current };
    if (valor.trim() === '') delete nuevos[nombre];
    else nuevos[nombre] = valor;
    actuales.current = nuevos;
    setValores(nuevos);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => onCambiar(nuevos), inmediato ? 0 : ESPERA_MS);
  }

  function quitar(nombre: string) {
    const restantes = { ...aplicados };
    delete restantes[nombre];
    onCambiar(restantes);
  }

  /** BUS-005: guarda lo que se ve en el formulario. Si había algo esperando a aplicarse (se
   * acaba de tipear), se aplica ya, así el perfil y la lista quedan iguales. */
  function guardarPerfil() {
    clearTimeout(temporizador.current);
    const filtros = actuales.current;
    if (JSON.stringify(filtros) !== clave) onCambiar(filtros);
    onGuardarPerfil?.(filtros);
  }

  // `true` o nada: sin la marca, el atributo no se escribe
  const invalido = (...campos: string[]) =>
    campos.some((c) => camposInvalidos.includes(c)) || undefined;

  const hayMetricas = METRICAS.some((m) => valores[m.nombre] !== undefined);
  const chips = Object.entries(aplicados);

  const formulario = (
    <>
      <div className="bf__fila">
        {/* BUS-010: viaja tal como se escribe; el backend lo normaliza y lo compara (RN-035) */}
        <div className="bf__campo">
          <label htmlFor="nombre">Nombre del jugador</label>
          <input
            className="input"
            id="nombre"
            type="text"
            maxLength={NOMBRE_LARGO_MAXIMO}
            placeholder="Ej.: Beltrán"
            autoComplete="off"
            value={valores.nombre ?? ''}
            onChange={(e) => cambiar('nombre', e.target.value, false)}
          />
        </div>
        <div className="bf__campo">
          <label htmlFor="posicion">Posición</label>
          <select
            className="input"
            id="posicion"
            aria-invalid={invalido('posicion')}
            value={valores.posicion ?? ''}
            onChange={(e) => cambiar('posicion', e.target.value, true)}
          >
            <option value="">Todas</option>
            {Object.entries(POSICIONES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="bf__campo">
          <label htmlFor="liga_id">Liga</label>
          <select
            className="input"
            id="liga_id"
            aria-invalid={invalido('liga_id')}
            value={valores.liga_id ?? ''}
            onChange={(e) => cambiar('liga_id', e.target.value, true)}
          >
            <option value="">Todas</option>
            {ligas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="bf__campo bf__campo--edad">
          <span className="bf__leyenda">Edad</span>
          <div className="bf__par">
            <input
              className="input"
              type="number"
              min={15}
              max={45}
              placeholder="Desde"
              aria-label="Edad mínima"
              aria-invalid={invalido('edad', 'edad_min')}
              value={valores.edad_min ?? ''}
              onChange={(e) => cambiar('edad_min', e.target.value, false)}
            />
            <input
              className="input"
              type="number"
              min={15}
              max={45}
              placeholder="Hasta"
              aria-label="Edad máxima"
              aria-invalid={invalido('edad', 'edad_max')}
              value={valores.edad_max ?? ''}
              onChange={(e) => cambiar('edad_max', e.target.value, false)}
            />
          </div>
        </div>
        <div className="bf__campo bf__campo--presupuesto">
          <label htmlFor="presupuesto_max_eur">Presupuesto máximo (EUR)</label>
          <input
            className="input"
            id="presupuesto_max_eur"
            type="number"
            min={1}
            aria-describedby="presupuesto_ayuda"
            value={valores.presupuesto_max_eur ?? ''}
            onChange={(e) => cambiar('presupuesto_max_eur', e.target.value, false)}
          />
          <p id="presupuesto_ayuda" className="muted bf__ayuda">
            Cualquier monto, en euros.
          </p>
        </div>
      </div>

      {/* key: si llega un filtro de métrica por la URL, el desplegable se abre solo */}
      <details className="bf__mas" key={hayMetricas ? 'abierto' : 'cerrado'} open={hayMetricas}>
        <summary>Métricas tácticas</summary>
        <div className="bf__fila bf__fila--metricas">
          {METRICAS.map((m) => (
            <div key={m.nombre} className="bf__campo">
              <label htmlFor={m.nombre}>{m.label}</label>
              <input
                className="input"
                id={m.nombre}
                type="number"
                min={0}
                step="any"
                value={valores[m.nombre] ?? ''}
                onChange={(e) => cambiar(m.nombre, e.target.value, false)}
              />
            </div>
          ))}
        </div>
      </details>

      {onGuardarPerfil && (
        <div className="bf__perfil">
          <p className="muted bf__resumen">
            {resumenPerfil ?? 'Todavía no guardaste un perfil de búsqueda.'}
          </p>
          <div className="bf__acciones">
            {onCargarPerfil && (
              <button className="btn btn--ghost btn--sm" type="button" onClick={onCargarPerfil}>
                Cargar perfil guardado
              </button>
            )}
            <button className="btn btn--primary btn--sm" type="button" onClick={guardarPerfil}>
              Guardar perfil de búsqueda
            </button>
          </div>
        </div>
      )}
      {errorPerfil && (
        <div className="alert" role="alert">
          <span className="alert__i">!</span>
          <span>{errorPerfil}</span>
        </div>
      )}
    </>
  );

  const listaChips = (
    <>
      {chips.length > 0 && (
        <ul className="bf__chips" aria-label="Filtros aplicados">
          {chips.map(([nombre, valor]) => {
            const etiqueta = etiquetaChip(nombre, valor, ligas);
            return (
              <li key={nombre} className="chip chip--accent">
                <span>{etiqueta}</span>
                <button
                  type="button"
                  aria-label={`Quitar filtro ${etiqueta}`}
                  onClick={() => quitar(nombre)}
                >
                  ×
                </button>
              </li>
            );
          })}
          <li>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => onCambiar({})}>
              Limpiar todo
            </button>
          </li>
        </ul>
      )}
    </>
  );

  if (!chica) {
    return (
      <section className="card bf" aria-label="Filtros de búsqueda">
        {formulario}
        {listaChips}
      </section>
    );
  }

  const textoVer =
    totalResultados === null
      ? 'Ver resultados'
      : `Ver ${totalResultados} ${totalResultados === 1 ? 'resultado' : 'resultados'}`;

  return (
    <section className="card bf bf--chica" aria-label="Filtros de búsqueda">
      <div className="bf__tira">
        <button
          className="btn btn--primary"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={abierta}
          onClick={() => setAbierta(true)}
        >
          Filtros{chips.length > 0 ? ` (${chips.length})` : ''}
        </button>
      </div>
      {listaChips}
      {abierta && (
        <>
          <div
            className="hoja__fondo"
            data-testid="fondo-filtros"
            onClick={() => setAbierta(false)}
          />
          <div
            ref={hoja}
            className="hoja"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            tabIndex={-1}
            onKeyDown={(e) => e.key === 'Escape' && setAbierta(false)}
          >
            <div className="hoja__cab">
              <h2>Filtros</h2>
              <button
                type="button"
                className="hoja__x"
                aria-label="Cerrar filtros"
                onClick={() => setAbierta(false)}
              >
                ×
              </button>
            </div>
            <div className="hoja__cuerpo">{formulario}</div>
            <div className="hoja__pie">
              <button className="btn btn--primary" type="button" onClick={() => setAbierta(false)}>
                {textoVer}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
