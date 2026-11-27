import { useEffect, useRef, useState } from 'react';

const PASOS = [
  {
    titulo: 'Buscá',
    texto:
      'Filtrá por posición, edad, liga, presupuesto y métricas tácticas. Los resultados se actualizan solos.',
  },
  {
    titulo: 'Elegí 2 o 3',
    texto: 'Marcá “Comparar” en los candidatos que te interesen, o abrí uno para ver su ficha.',
  },
  {
    titulo: 'Compará',
    texto:
      'Mirá sus métricas lado a lado, con quién rinde mejor en cada una y cuánto cuesta cada uno.',
  },
];

/** UI-007: guía de bienvenida de 3 pasos. */
export default function Tour({ onCerrar }: { onCerrar: () => void }) {
  const [i, setI] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  useEffect(() => caja.current?.focus(), []);

  return (
    <div className="tour__fondo">
      <div
        ref={caja}
        className="tour"
        role="dialog"
        aria-modal="true"
        aria-label="Guía de bienvenida"
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
      >
        <p className="tour__n">
          Paso {i + 1} de {PASOS.length}
        </p>
        <div className="tour__puntos" aria-hidden="true">
          {PASOS.map((_, k) => (
            <i key={k} className={k === i ? 'is-on' : ''} />
          ))}
        </div>
        <h2 key={i} className="tour__tit">
          {paso.titulo}
        </h2>
        <p className="tour__txt">{paso.texto}</p>
        <div className="tour__acc">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCerrar}>
            Saltar guía
          </button>
          <span style={{ flex: 1 }} />
          {i > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => setI(i - 1)}>
              Atrás
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => (ultimo ? onCerrar() : setI(i + 1))}
          >
            {ultimo ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
