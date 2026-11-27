/** UI-007: definiciones cortas de las métricas de RN-001, para el "i" junto a cada una. Son
 *  descripciones de lo que se muestra; no agregan reglas ni nombran proveedores (RN-029). */
export const DEFINICIONES: Record<string, string> = {
  minutos_jugados: 'Minutos que el jugador estuvo en cancha en la temporada.',
  partidos_jugados: 'Partidos en los que el jugador participó en la temporada.',
  goles: 'Goles convertidos en la temporada.',
  asistencias: 'Pases que terminaron en gol de un compañero.',
  pases_precision_pct: 'Porcentaje de pases que llegaron a un compañero.',
  duelos_ganados_pct: 'Porcentaje de duelos individuales que el jugador ganó.',
  recuperaciones_por_partido:
    'Veces por partido que el jugador recuperó la pelota (intercepciones).',
  rating: 'Calificación promedio por partido, de 0 a 10. Entre ligas puede no ser comparable.',
};
