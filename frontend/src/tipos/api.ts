// Tipos alineados a docs/CONTRATO_DE_API.md

/** Formato único de error: {"detalle", "codigo"}. Los 422 suman "errores". */
export interface RespuestaError {
  detalle: string;
  codigo: string;
  errores?: { campo: string; mensaje: string }[];
}

export interface RespuestaSalud {
  estado: 'ok' | 'error';
  base_de_datos: 'ok' | 'error';
}

// --- Enums / uniones canónicas ---

export type RolUsuario = 'director_tecnico' | 'director_deportivo' | 'dirigente' | 'ojeador';

/** RN-019 — 4 posiciones del MVP */
export type Posicion = 'arquero' | 'defensor' | 'mediocampista' | 'delantero';

export type CoberturaLiga = 'completa' | 'basica' | 'sin_datos';

export type OrdenBusqueda = 'minutos' | 'valor' | 'edad' | 'pases' | 'rating';

export type EstadoCriterio = 'cumple' | 'no_cumple' | 'sin_dato';

// --- Auth ---

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  club: string;
}

export interface RegistroRequest {
  nombre: string;
  email: string;
  rol: RolUsuario;
  club: string;
  contrasena: string;
  acepta_terminos: boolean;
}

export interface IngresoRequest {
  email: string;
  contrasena: string;
}

// --- Ligas ---

export interface Liga {
  id: number;
  nombre: string;
  cobertura: CoberturaLiga;
  temporada_actual: number;
}

/** Liga embebida en JugadorResumen / ficha (sin temporada_actual) */
export interface LigaResumen {
  id: number;
  nombre: string;
  cobertura: CoberturaLiga;
}

// --- Métricas y jugadores ---

/** Siempre se devuelven todas las claves; null = dato no disponible (RN-008) */
export interface Metricas {
  partidos_jugados: number | null;
  minutos_jugados: number | null;
  goles: number | null;
  asistencias: number | null;
  pases_precision_pct: number | null;
  duelos_ganados_pct: number | null;
  recuperaciones_por_partido: number | null;
  rating: number | null;
}

/** Filas de resultados y lista de seguimiento */
export interface JugadorResumen {
  id: number;
  nombre: string;
  posicion: Posicion | null;
  edad: number | null;
  equipo: string;
  liga: LigaResumen;
  temporada: number;
  minutos_jugados: number | null;
  pases_precision_pct: number | null;
  duelos_ganados_pct: number | null;
  recuperaciones_por_partido: number | null;
  rating: number | null;
  valor_mercado_eur: number | null;
  en_seguimiento: boolean;
}

// --- Búsqueda ---

export interface FiltrosBusqueda {
  posicion?: Posicion;
  edad_min?: number;
  edad_max?: number;
  liga_id?: number;
  pases_min?: number;
  duelos_min?: number;
  recuperaciones_min?: number;
  minutos_min?: number;
  presupuesto_max_eur?: number;
  orden?: OrdenBusqueda;
  pagina?: number;
  tamano?: number;
}

/** RN-016 — solo cuando total === 0 */
export interface SugerenciaBusqueda {
  filtro: string;
  etiqueta: string;
  cantidad: number;
}

export interface RespuestaBusqueda {
  resultados: JugadorResumen[];
  total: number;
  pagina: number;
  tamano: number;
  excluidos_por_dato_faltante: number;
  excluidos_sin_valor: number;
  liga_sin_datos: boolean;
  sugerencia: SugerenciaBusqueda | null;
}

// --- Ficha ---

export interface ValorMercado {
  eur: number;
  fecha: string; // YYYY-MM-DD
  fuente: string;
}

export interface CriterioCoincidencia {
  criterio: string;
  estado: EstadoCriterio;
  texto: string;
}

export interface Coincidencia {
  cumple: number;
  total: number;
  criterios: CriterioCoincidencia[];
}

export interface FichaJugador {
  id: number;
  nombre: string;
  posicion: Posicion | null;
  edad: number | null;
  fecha_nacimiento: string | null;
  nacionalidad: string | null;
  equipo: string;
  liga: LigaResumen;
  temporada: number;
  metricas: Metricas;
  promedios_posicion: Metricas;
  valor_mercado: ValorMercado | null;
  en_seguimiento: boolean;
  coincidencia: Coincidencia | null;
}

// --- Comparación ---

export interface ComparacionRequest {
  jugador_ids: [number, number] | [number, number, number];
}

export interface JugadorComparacion {
  id: number;
  nombre: string;
  posicion: Posicion | null;
  edad: number | null;
  equipo: string;
  liga: LigaResumen;
  temporada: number;
  valor_mercado_eur: number | null;
}

export interface FilaComparacion {
  metrica: string;
  etiqueta: string;
  /** mismo orden que jugadores; null = no disponible */
  valores: (number | null)[];
  mejor: number[]; // ids
  peor: number[];
}

export interface RespuestaComparacion {
  jugadores: JugadorComparacion[];
  filas: FilaComparacion[];
  /** clave = id de jugador como string */
  metricas_ganadas: Record<string, number>;
  diferencia_valor_eur: number | null;
  mas_barato_id: number | null;
}

// --- Perfil de búsqueda ---

export interface PerfilBusqueda {
  posicion: Posicion;
  liga_id: number;
  edad_min: number;
  edad_max: number;
  presupuesto_max_eur: number | null;
  pases_min: number | null;
  duelos_min: number | null;
  recuperaciones_min: number | null;
  minutos_min: number | null;
}

/** Body del PUT (sin id; el backend crea o reemplaza) */
export type PerfilBusquedaRequest = PerfilBusqueda;

// --- Seguimiento ---

export interface SeguimientoRequest {
  jugador_id: number;
}

export interface RespuestaSeguimiento {
  jugador_id: number;
  aviso: string | null;
}
