import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const DURACION_MS = 4200;

const AvisosContext = createContext<(mensaje: string) => void>(() => {});

/** Toasts simples (clases .toasts/.toast de base.css). */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<{ id: number; mensaje: string }[]>([]);

  const avisar = useCallback((mensaje: string) => {
    const id = Date.now() + Math.random();
    setAvisos((actuales) => [...actuales, { id, mensaje }]);
    setTimeout(() => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), DURACION_MS);
  }, []);

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div className="toasts" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className="toast">
            {a.mensaje}
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAvisar = () => useContext(AvisosContext);
