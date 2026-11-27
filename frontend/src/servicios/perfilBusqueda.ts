import type { PerfilBusqueda } from '../tipos/api';

// BUS-005: todavía sin implementar. Existe para que los tests en rojo compilen.
export const obtenerPerfil = (): Promise<PerfilBusqueda | null> => Promise.resolve(null);

export const guardarPerfil = (perfil: PerfilBusqueda): Promise<PerfilBusqueda> =>
  Promise.reject(new Error(`Sin implementar: ${perfil.posicion}`));
