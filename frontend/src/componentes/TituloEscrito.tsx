import { Fragment, useEffect, useState } from 'react';

import { reduceMovimiento } from '../utilidades/movimiento';

export const TEXTO_TITULO = 'Fichá con datos, no a ojo.';
// "a ojo" va en <em> (dorado) también mientras se escribe
const TRAMOS = [
  { texto: 'Fichá con datos, no ', em: false },
  { texto: 'a ojo', em: true },
  { texto: '.', em: false },
];
const MS_POR_LETRA = 50;
const MS_CURSOR_FINAL = 500;
const LETRAS = TEXTO_TITULO.length;

// Una sola vez por carga de la página: al volver a la home dentro de la sesión ya aparece completo
let yaSeEscribio = false;

/** Solo para los tests: vuelve al estado de una carga nueva. */
export function reiniciarTituloEscrito() {
  yaSeEscribio = false;
}

/** ¿Hay que escribir el título? Es pura (StrictMode puede llamarla dos veces): el uso se marca
 *  recién cuando empieza a escribirse. */
export const tocaEscribir = (): boolean => !yaSeEscribio && !reduceMovimiento();

interface Props {
  /** se avisa al terminar de escribir (no se llama si aparece completo) */
  onTerminar?: () => void;
  /** lo decide quien lo usa con tocaEscribir(); por defecto, lo decide el título */
  animar?: boolean;
}

/**
 * Título del hero (UI-011). El <h1> tiene el texto completo como nombre accesible y la parte
 * animada va con aria-hidden: los lectores y buscadores no ven letras sueltas. Todas las letras
 * están en el flujo desde el principio (las que faltan, con visibility: hidden), así que no hay
 * saltos de diseño. Sin animación, el estado es el completo.
 */
export default function TituloEscrito({ onTerminar, animar }: Props) {
  const [escribe] = useState(() => animar ?? tocaEscribir());
  const [escritas, setEscritas] = useState(escribe ? 0 : LETRAS);
  const [cursor, setCursor] = useState(escribe);

  useEffect(() => {
    if (!escribe) return;
    yaSeEscribio = true;
    let n = 0;
    const tic = window.setInterval(() => {
      n += 1;
      setEscritas(n);
      if (n >= LETRAS) window.clearInterval(tic);
    }, MS_POR_LETRA);
    const fin = window.setTimeout(
      () => {
        setCursor(false);
        onTerminar?.();
      },
      LETRAS * MS_POR_LETRA + MS_CURSOR_FINAL,
    );
    return () => {
      window.clearInterval(tic);
      window.clearTimeout(fin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escribe]);

  let i = 0;
  const letra = (c: string) => {
    const k = i++;
    const clases = ['tit__l'];
    if (k >= escritas) clases.push('is-oculta');
    if (cursor && k === Math.max(escritas, 1) - 1) clases.push('is-cursor');
    return (
      <span key={k} className={clases.join(' ')}>
        {c}
      </span>
    );
  };

  return (
    <h1 aria-label={TEXTO_TITULO}>
      <span className="tit__animado" aria-hidden="true">
        {TRAMOS.map((t) => {
          const letras = [...t.texto].map(letra);
          return t.em ? (
            <em key={t.texto}>{letras}</em>
          ) : (
            <Fragment key={t.texto}>{letras}</Fragment>
          );
        })}
      </span>
    </h1>
  );
}
