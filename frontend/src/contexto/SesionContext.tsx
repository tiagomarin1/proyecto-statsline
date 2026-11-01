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
      await pedirApi<void>('/auth/salida', { method: 'POST' });
      setUsuario(null);
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
