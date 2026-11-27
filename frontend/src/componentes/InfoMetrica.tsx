import { useId, useState } from 'react';

import { DEFINICIONES } from '../utilidades/glosario';

/** UI-007: el "i" que explica una métrica, con su definición en una burbuja. */
export default function InfoMetrica({ metrica, etiqueta }: { metrica: string; etiqueta: string }) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();
  const definicion = DEFINICIONES[metrica];
  if (!definicion) return null;
  return (
    <span className="info">
      <button
        type="button"
        className="info__i"
        aria-label={`Qué es ${etiqueta}`}
        aria-expanded={abierta}
        aria-controls={abierta ? id : undefined}
        onClick={() => setAbierta(!abierta)}
        onBlur={() => setAbierta(false)}
        onKeyDown={(e) => e.key === 'Escape' && setAbierta(false)}
      >
        i
      </button>
      {abierta && (
        <span id={id} role="note" className="info__burbuja">
          {definicion}
        </span>
      )}
    </span>
  );
}
