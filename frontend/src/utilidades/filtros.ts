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

// RN-003: el back rechaza con 422 cualquier presupuesto fuera de este rango
export const PRESUPUESTO_MINIMO_EUR = 20_000;
export const PRESUPUESTO_MAXIMO_EUR = 400_000;
export const PASO_PRESUPUESTO_EUR = 5_000;

/** Candidatos por página: la tabla pide más que las tarjetas (el máximo del contrato es 50). */
export const TAMANO_TABLA = 15;
export const TAMANO_TARJETAS = 6;

/** Los filtros que se aplican solos desde la barra. `orden` y `pagina` no son filtros. */
export const NOMBRES_FILTRO = [
  'posicion',
  'liga_id',
  'edad_min',
  'edad_max',
  'presupuesto_max_eur',
  ...METRICAS.map((m) => m.nombre),
] as const;

export const ETIQUETAS_FILTRO: Record<string, string> = {
  posicion: 'Posición',
  liga_id: 'Liga',
  edad_min: 'Edad mínima',
  edad_max: 'Edad máxima',
  presupuesto_max_eur: 'Presupuesto máximo (EUR)',
  ...Object.fromEntries(METRICAS.map((m) => [m.nombre, m.label])),
};

/** Los valores de los filtros que hay en la URL, sin orden ni paginado. */
export function filtrosDeParams(params: URLSearchParams): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const nombre of NOMBRES_FILTRO) {
    const valor = params.get(nombre);
    if (valor) valores[nombre] = valor;
  }
  return valores;
}
