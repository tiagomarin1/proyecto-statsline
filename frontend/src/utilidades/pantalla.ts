import { useEffect, useState } from 'react';

const CONSULTA_PANTALLA_CHICA = '(max-width: 767px)';

const hayMatchMedia = () => typeof window.matchMedia === 'function';

/** true en pantallas de menos de 768 px (el breakpoint del prototipo). Sin matchMedia, false. */
export function usePantallaChica() {
  const [chica, setChica] = useState(
    () => hayMatchMedia() && window.matchMedia(CONSULTA_PANTALLA_CHICA).matches,
  );

  useEffect(() => {
    if (!hayMatchMedia()) return;
    const consulta = window.matchMedia(CONSULTA_PANTALLA_CHICA);
    const alCambiar = () => setChica(consulta.matches);
    alCambiar();
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  return chica;
}
