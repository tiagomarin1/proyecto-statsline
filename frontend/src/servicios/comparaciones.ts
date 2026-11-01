import type { RespuestaComparacion } from '../tipos/api';
import { pedirApi } from './api';

/** CMP-001 — compara 2 o 3 jugadores. El backend calcula mejor/peor y el resto (RN-006). */
export const compararJugadores = (jugador_ids: number[]) =>
  pedirApi<RespuestaComparacion>('/comparaciones', {
    method: 'POST',
    body: JSON.stringify({ jugador_ids }),
  });
