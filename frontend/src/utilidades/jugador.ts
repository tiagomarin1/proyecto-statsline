import type { FichaJugador, JugadorResumen } from '../tipos/api';

/** CMP-005: arma el resumen que usa la selección para comparar a partir de la ficha. */
export function resumenDeFicha(f: FichaJugador): JugadorResumen {
  return {
    id: f.id,
    nombre: f.nombre,
    nombre_completo: f.nombre_completo,
    posicion: f.posicion,
    edad: f.edad,
    equipo: f.equipo,
    liga: f.liga,
    temporada: f.temporada,
    minutos_jugados: f.metricas.minutos_jugados ?? null,
    pases_precision_pct: f.metricas.pases_precision_pct ?? null,
    duelos_ganados_pct: f.metricas.duelos_ganados_pct ?? null,
    recuperaciones_por_partido: f.metricas.recuperaciones_por_partido ?? null,
    rating: f.metricas.rating ?? null,
    valor_mercado_eur: f.valor_mercado?.eur ?? null,
    en_seguimiento: f.en_seguimiento,
  };
}
