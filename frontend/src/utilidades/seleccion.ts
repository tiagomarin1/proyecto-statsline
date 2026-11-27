import { useState } from 'react';

import type { JugadorResumen } from '../tipos/api';

export const MAX_COMPARAR = 3;

/** Selección de jugadores para comparar (CMP-001, RN-007): hasta 3, con aviso al intentar un
 *  cuarto. Guarda el jugador entero para que la barra lo muestre aunque cambie la lista. */
export function useSeleccion(avisar: (mensaje: string) => void) {
  const [seleccion, setSeleccion] = useState<JugadorResumen[]>([]);

  function alternar(j: JugadorResumen) {
    if (seleccion.some((s) => s.id === j.id)) {
      setSeleccion(seleccion.filter((s) => s.id !== j.id));
      return;
    }
    if (seleccion.length >= MAX_COMPARAR) {
      avisar(`Se pueden comparar hasta ${MAX_COMPARAR} jugadores a la vez.`);
      return;
    }
    setSeleccion([...seleccion, j]);
  }

  const quitar = (id: number) => setSeleccion((s) => s.filter((x) => x.id !== id));
  const limpiar = () => setSeleccion([]);

  return { seleccion, setSeleccion, alternar, quitar, limpiar };
}
