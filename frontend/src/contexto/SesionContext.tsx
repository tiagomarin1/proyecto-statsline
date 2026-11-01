import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { pedirApi } from '../servicios/api';
import type { IngresoRequest, RegistroRequest, Usuario } from '../tipos/api';

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
  ingresar: (datos: IngresoRequest) => Promise<Usuario>;
  registrarse: (datos: RegistroRequest) => Promise<Usuario>;
  salir: () => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    pedirApi<Usuario>('/auth/yo')
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  // Si la sesión vence a mitad de uso, pedirApi emite este evento ante un 401 sin_sesion:
  // limpiamos el usuario una sola vez y RutaProtegida se encarga de mandar a /ingresar.
  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, []);

  async function autenticar(ruta: string, datos: IngresoRequest | RegistroRequest) {
    const u = await pedirApi<Usuario>(ruta, { method: 'POST', body: JSON.stringify(datos) });
    setUsuario(u);
    return u;
  }

  const valor: Sesion = {
    usuario,
    cargando,
    ingresar: (datos) => autenticar('/auth/ingreso', datos),
    registrarse: (datos) => autenticar('/auth/registro', datos),
    salir: async () => {
      try {
        await pedirApi<void>('/auth/salida', { method: 'POST' });
      } catch {
        // La salida es best-effort: si el backend falla (p. ej. cookie vencida), igual cerramos
        // la sesión en la UI para no dejarla abierta.
      } finally {
        setUsuario(null);
      }
    },
  };

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return sesion;
}
