import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { NOTAS_LARGO_MAXIMO } from '../utilidades/pdfComparacion';

interface Props {
  onCerrar: () => void;
  /** genera y descarga el PDF con las notas; si falla, el diálogo lo dice */
  onDescargar: (notas: string) => Promise<void>;
}

const MENSAJE_ERROR = 'No pudimos generar el PDF. Probá de nuevo.';

/** CMP-002: antes de descargar, un cuadro opcional para sumar notas al PDF. Las notas no se
 *  guardan en ningún lado. Usa el mismo modal que la guía (UI-007). */
export default function DialogoPdf({ onCerrar, onDescargar }: Props) {
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState<'listo' | 'generando' | 'error'>('listo');
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const idTitulo = useId();
  const idNotas = useId();
  const idContador = useId();

  useEffect(() => campo.current?.focus(), []);

  async function descargar() {
    setEstado('generando');
    try {
      await onDescargar(notas);
      onCerrar();
    } catch {
      setEstado('error');
    }
  }

  // Escape cierra; Tab no sale del diálogo
  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape' && estado !== 'generando') {
      e.stopPropagation();
      onCerrar();
      return;
    }
    if (e.key !== 'Tab' || !caja.current) return;
    const foco = [
      ...caja.current.querySelectorAll<HTMLElement>('textarea, button:not([disabled])'),
    ];
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  const generando = estado === 'generando';
  return (
    <div className="tour__fondo">
      <div
        ref={caja}
        className="tour dpdf"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onKeyDown={alTeclear}
      >
        <h2 id={idTitulo} className="dpdf__tit">
          Exportar PDF
        </h2>
        <p className="tour__txt">
          Se descarga la comparación completa, con todos los jugadores y todas las métricas. Las
          notas van al final del PDF y no se guardan.
        </p>
        <label className="dpdf__lbl" htmlFor={idNotas}>
          Notas (opcional)
        </label>
        <textarea
          ref={campo}
          id={idNotas}
          className="dpdf__notas"
          rows={5}
          maxLength={NOTAS_LARGO_MAXIMO}
          value={notas}
          aria-describedby={idContador}
          disabled={generando}
          onChange={(e) => setNotas(e.target.value)}
        />
        <p id={idContador} className="dpdf__contador">
          {notas.length} / {NOTAS_LARGO_MAXIMO}
        </p>
        {estado === 'error' && (
          <p className="alert dpdf__error" role="alert">
            <span className="alert__i">!</span>
            <span>{MENSAJE_ERROR}</span>
          </p>
        )}
        <div className="tour__acc">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn--ghost" disabled={generando} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={generando}
            aria-busy={generando}
            onClick={descargar}
          >
            {generando ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
