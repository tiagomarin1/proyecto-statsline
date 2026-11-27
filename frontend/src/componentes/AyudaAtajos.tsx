import { useEffect, useRef } from 'react';

const ATAJOS = [
  ['/', 'Ir al campo de nombre'],
  ['c', 'Comparar los jugadores seleccionados'],
  ['?', 'Ver esta ayuda'],
  ['Esc', 'Cerrar paneles y ayudas'],
];

export default function AyudaAtajos({ onCerrar }: { onCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => caja.current?.focus(), []);
  return (
    <div className="tour__fondo" onClick={onCerrar}>
      <div
        ref={caja}
        className="tour"
        role="dialog"
        aria-modal="true"
        aria-label="Atajos de teclado"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
      >
        <h2 className="tour__tit">Atajos de teclado</h2>
        <dl className="atajos">
          {ATAJOS.map(([tecla, texto]) => (
            <div key={tecla}>
              <dt>
                <kbd>{tecla}</kbd>
              </dt>
              <dd>{texto}</dd>
            </div>
          ))}
        </dl>
        <div className="tour__acc">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn--primary" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
