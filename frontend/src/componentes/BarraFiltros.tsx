import { useEffect, useRef, useState } from 'react';

import type { Liga } from '../tipos/api';
import {
  filtrosDeParams,
  METRICAS,
  NOMBRE_LARGO_MAXIMO,
  PASO_PRESUPUESTO_EUR,
  PRESUPUESTO_MAXIMO_EUR,
  PRESUPUESTO_MINIMO_EUR,
} from '../utilidades/filtros';
import { formatearEur, POSICIONES } from '../utilidades/formato';

/** Lo que se espera después de la última tecla antes de pedir los resultados. */
const ESPERA_MS = 350;

interface Props {
  /** La URL de /buscar: es la fuente de verdad de los filtros. */
  params: URLSearchParams;
  ligas: Liga[];
  /** Recibe todos los filtros que quedan activos, sin los vacíos. */
  onCambiar: (filtros: Record<string, string>) => void;
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
export default function BarraFiltros({ params, ligas, onCambiar }: Props) {
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

  const hayMetricas = METRICAS.some((m) => valores[m.nombre] !== undefined);
  const chips = Object.entries(aplicados);

  return (
    <section className="card bf" aria-label="Filtros de búsqueda">
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
            min={PRESUPUESTO_MINIMO_EUR}
            max={PRESUPUESTO_MAXIMO_EUR}
            step={PASO_PRESUPUESTO_EUR}
            aria-describedby="presupuesto_rango"
            value={valores.presupuesto_max_eur ?? ''}
            onChange={(e) => cambiar('presupuesto_max_eur', e.target.value, false)}
          />
          <p id="presupuesto_rango" className="muted bf__ayuda">
            De {formatearEur(PRESUPUESTO_MINIMO_EUR)} a {formatearEur(PRESUPUESTO_MAXIMO_EUR)}.
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
    </section>
  );
}
