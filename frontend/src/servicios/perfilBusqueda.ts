import type { PerfilBusqueda, PerfilBusquedaRequest } from '../tipos/api';
import { ErrorApi, pedirApi } from './api';

/** BUS-005: el perfil guardado del usuario, o null si todavía no guardó ninguno (404 sin_perfil). */
export async function obtenerPerfil(): Promise<PerfilBusqueda | null> {
  try {
    return await pedirApi<PerfilBusqueda>('/perfil-busqueda');
  } catch (e) {
    if (e instanceof ErrorApi && e.codigo === 'sin_perfil') return null;
    throw e;
  }
}

/** Crea el perfil o reemplaza al anterior: hay uno solo por usuario (RN-023). */
export const guardarPerfil = (perfil: PerfilBusquedaRequest) =>
  pedirApi<PerfilBusqueda>('/perfil-busqueda', { method: 'PUT', body: JSON.stringify(perfil) });
