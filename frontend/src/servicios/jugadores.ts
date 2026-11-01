import type { FichaJugador, Liga, RespuestaBusqueda } from '../tipos/api';
import { pedirApi } from './api';

export const listarLigas = () => pedirApi<Liga[]>('/ligas');

/** Recibe los filtros tal cual están en la URL de /buscar; los vacíos ya no viajan. */
export const buscarJugadores = (filtros: URLSearchParams) =>
  pedirApi<RespuestaBusqueda>(`/jugadores?${filtros}`);

/** Los filtros opcionales hacen que el backend calcule la coincidencia (RN-012). */
export const obtenerFicha = (id: string, filtros: URLSearchParams) =>
  pedirApi<FichaJugador>(`/jugadores/${id}?${filtros}`);
