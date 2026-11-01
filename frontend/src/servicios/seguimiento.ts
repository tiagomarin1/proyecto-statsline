import type { JugadorResumen, RespuestaSeguimiento } from '../tipos/api';
import { pedirApi } from './api';

export const listarSeguimiento = () => pedirApi<JugadorResumen[]>('/seguimiento');

export const seguirJugador = (jugador_id: number) =>
  pedirApi<RespuestaSeguimiento>('/seguimiento', {
    method: 'POST',
    body: JSON.stringify({ jugador_id }),
  });

export const dejarDeSeguir = (jugador_id: number) =>
  pedirApi<void>(`/seguimiento/${jugador_id}`, { method: 'DELETE' });

/** Agrega o quita según el estado actual y devuelve el texto para el aviso. */
export async function alternarSeguimiento(jugador: {
  id: number;
  nombre: string;
  en_seguimiento: boolean;
}) {
  if (jugador.en_seguimiento) {
    await dejarDeSeguir(jugador.id);
    return `${jugador.nombre} salió de la lista de seguimiento.`;
  }
  const { aviso } = await seguirJugador(jugador.id);
  return aviso ?? `${jugador.nombre} quedó guardado en la lista de seguimiento.`;
}
