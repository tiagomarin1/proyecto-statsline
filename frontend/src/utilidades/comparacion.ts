/** Lógica pura de las barras de la comparación (CMP-004, RN-006 y RN-037). */
import type { FilaComparacion } from '../tipos/api';
import { formatearEur } from './formato';

export type Grupo = 'ataque' | 'pase_defensa' | 'participacion';
export const GRUPOS: { clave: Grupo | 'todas'; etiqueta: string }[] = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'ataque', etiqueta: 'Ataque' },
  { clave: 'pase_defensa', etiqueta: 'Pase y defensa' },
  { clave: 'participacion', etiqueta: 'Participación' },
];

const GRUPO_DE: Record<string, Grupo> = {
  goles: 'ataque',
  asistencias: 'ataque',
  pases_precision_pct: 'pase_defensa',
  duelos_ganados_pct: 'pase_defensa',
  recuperaciones_por_partido: 'pase_defensa',
  minutos_jugados: 'participacion',
  partidos_jugados: 'participacion',
  rating: 'participacion',
};

export const grupoDeMetrica = (metrica: string): Grupo => GRUPO_DE[metrica] ?? 'participacion';

const UMBRAL_DIFERENCIA = 0.1;

const disponibles = (valores: (number | null)[]): number[] =>
  valores.filter((v): v is number => v !== null);

/** RN-037: (máximo − mínimo) / máximo >= 10 %, entre quienes tienen el dato. */
export function diferenciaGrande(valores: (number | null)[]): boolean {
  const v = disponibles(valores);
  if (v.length < 2) return false;
  const maximo = Math.max(...v);
  if (maximo <= 0) return false;
  return (maximo - Math.min(...v)) / maximo >= UMBRAL_DIFERENCIA - 1e-9;
}

/** RN-006 sobre los jugadores visibles: empates se marcan todos; sin dato no compite. */
export function mejorYPeor(valores: Record<number, number | null>): {
  mejor: number[];
  peor: number[];
} {
  const con = Object.entries(valores)
    .filter((par): par is [string, number] => par[1] !== null)
    .map(([id, v]) => [Number(id), v] as const);
  if (con.length < 2) return { mejor: [], peor: [] };
  const maximo = Math.max(...con.map(([, v]) => v));
  const minimo = Math.min(...con.map(([, v]) => v));
  return {
    mejor: con.filter(([, v]) => v === maximo).map(([id]) => id),
    peor: maximo === minimo ? [] : con.filter(([, v]) => v === minimo).map(([id]) => id),
  };
}

const ES_PORCENTAJE = new Set(['pases_precision_pct', 'duelos_ganados_pct']);
const redondear1 = (x: number) => Math.round(x * 10) / 10;

/** RN-037 (CMP-006): cuánto llena la barra, de 0 a 100. Representa el número de la celda: los
 *  porcentajes de 0 a 100, el rating de 0 a 10 y el resto contra el mayor valor de la fila (y del
 *  promedio, si se muestra su marca). Sin dato o con 0 la barra queda vacía. */
export function porcentajeBarra(
  metrica: string,
  valor: number | null,
  valoresFila: (number | null)[],
  promedio: number | null = null,
): number {
  if (valor === null || valor <= 0) return 0;
  if (ES_PORCENTAJE.has(metrica)) return Math.min(100, redondear1(valor));
  if (metrica === 'rating') return Math.min(100, redondear1(valor * 10));
  const mayor = Math.max(...disponibles(valoresFila), promedio ?? 0);
  return mayor > 0 ? Math.min(100, redondear1((valor / mayor) * 100)) : 0;
}

interface JugadorValor {
  id: number;
  nombre: string;
  valor_mercado_eur: number | null;
}

/** Frase de arriba de la comparación, con el nombre completo de cada jugador (CMP-006). */
export function resumenComparacion(
  filas: Pick<FilaComparacion, 'mejor'>[],
  jugadores: JugadorValor[],
): string {
  const letras = jugadores.map((j) => j.nombre);
  const ganadas = jugadores.map((j) => filas.filter((f) => f.mejor.includes(j.id)).length);
  const tope = Math.max(...ganadas);
  const lideres = letras.filter((_, i) => ganadas[i] === tope);
  let frase: string;
  if (tope === 0) {
    frase = 'Ningún jugador se destaca en las métricas';
  } else if (lideres.length === 1) {
    frase = `${lideres[0]} gana en ${tope} de ${filas.length} métricas`;
  } else {
    frase = `${lideres.slice(0, -1).join(', ')} y ${lideres[lideres.length - 1]} empatan en métricas (${tope} cada uno)`;
  }
  const conValor = jugadores
    .map((j, i) => ({ letra: letras[i], v: j.valor_mercado_eur }))
    .filter((x): x is { letra: string; v: number } => x.v !== null);
  if (conValor.length >= 2) {
    const barato = conValor.reduce((a, b) => (b.v < a.v ? b : a));
    const caro = Math.max(...conValor.map((x) => x.v));
    if (caro > barato.v) {
      frase += `; ${barato.letra} es ${formatearEur(caro - barato.v)} más barato`;
    }
  }
  return `${frase}.`;
}

/** Solo porcentajes y rating entran al radar (RN-037); el rating (0-10) se pasa a 0-100. */
const EN_RADAR = new Set(['pases_precision_pct', 'duelos_ganados_pct', 'rating']);

export function puntosRadar(
  filas: Pick<FilaComparacion, 'metrica' | 'etiqueta' | 'valores'>[],
): { etiqueta: string; valores: (number | null)[] }[] {
  return filas
    .filter((f) => EN_RADAR.has(f.metrica))
    .map((f) => ({
      etiqueta: f.etiqueta,
      valores: f.valores.map((v) =>
        v === null ? null : Math.round((f.metrica === 'rating' ? v * 10 : v) * 10) / 10,
      ),
    }));
}
