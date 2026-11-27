import type { OrdenBusqueda } from '../tipos/api';

export const ORDENES: Record<OrdenBusqueda, string> = {
  minutos: 'Minutos jugados',
  valor: 'Valor (menor primero)',
  edad: 'Edad (menor primero)',
  pases: '% pases completados',
  rating: 'Rating',
};

export const METRICAS = [
  { nombre: 'pases_min', label: '% pases completados (mín.)' },
  { nombre: 'duelos_min', label: 'Duelos ganados % (mín.)' },
  { nombre: 'recuperaciones_min', label: 'Recuperaciones por partido (mín.)' },
  { nombre: 'minutos_min', label: 'Minutos jugados (mín.)' },
];

// RN-029: sin una liga elegida se mezclan fuentes y el rating de cada proveedor no es comparable
export const MENSAJE_RATING_SIN_LIGA = 'Elegí una liga para ordenar por rating.';

/** Por qué no se puede ordenar así con los filtros de la URL, o null si se puede. */
export function motivoOrdenNoDisponible(
  orden: OrdenBusqueda,
  params: URLSearchParams,
): string | null {
  return orden === 'rating' && !params.get('liga_id') ? MENSAJE_RATING_SIN_LIGA : null;
}

/** Saca el orden de la URL si con los filtros nuevos ya no está disponible (vuelve a minutos). */
export function sinOrdenNoDisponible(params: URLSearchParams): URLSearchParams {
  const orden = params.get('orden') as OrdenBusqueda | null;
  if (orden && motivoOrdenNoDisponible(orden, params)) params.delete('orden');
  return params;
}

// RN-035: el back rechaza con 422 un nombre más largo
export const NOMBRE_LARGO_MAXIMO = 60;

/** Candidatos por página: 12 llenan la grilla de tarjetas de 1, 2 y 3 columnas (el máximo del contrato es 50). */
export const TAMANO_TARJETAS = 12;

/** Los filtros que se aplican solos desde la barra. `orden` y `pagina` no son filtros. */
export const NOMBRES_FILTRO = [
  'nombre',
  'posicion',
  'liga_id',
  'edad_min',
  'edad_max',
  'presupuesto_max_eur',
  ...METRICAS.map((m) => m.nombre),
] as const;

export const ETIQUETAS_FILTRO: Record<string, string> = {
  nombre: 'Nombre del jugador',
  posicion: 'Posición',
  liga_id: 'Liga',
  edad_min: 'Edad mínima',
  edad_max: 'Edad máxima',
  presupuesto_max_eur: 'Presupuesto máximo (EUR)',
  orden: 'Ordenar por',
  ...Object.fromEntries(METRICAS.map((m) => [m.nombre, m.label])),
};

/** Los valores de los filtros que hay en la URL, sin orden ni paginado. */
export function filtrosDeParams(params: URLSearchParams): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const nombre of NOMBRES_FILTRO) {
    const valor = params.get(nombre);
    // Un texto de solo espacios equivale a "sin filtro" (RN-024)
    if (valor?.trim()) valores[nombre] = valor;
  }
  return valores;
}
