/** UI-007: lo que se guarda en el navegador. Puede estar bloqueado (ventana privada, datos
 *  borrados): nada se rompe, solo se pierde la comodidad. */
const CLAVE_TOUR = 'statsline_tour_visto';
const CLAVE_BUSQUEDA = 'statsline_ultima_busqueda';

export function tourVisto(): boolean {
  try {
    return localStorage.getItem(CLAVE_TOUR) === '1';
  } catch {
    return false;
  }
}

export function marcarTourVisto(): void {
  try {
    localStorage.setItem(CLAVE_TOUR, '1');
  } catch {
    /* sin almacenamiento: el tour se muestra una vez por visita */
  }
}

/** La query de la última búsqueda, para "Volver a resultados" desde la comparación. */
export function guardarUltimaBusqueda(query: string): void {
  try {
    sessionStorage.setItem(CLAVE_BUSQUEDA, query);
  } catch {
    /* ver arriba */
  }
}

export function leerUltimaBusqueda(): string {
  try {
    return sessionStorage.getItem(CLAVE_BUSQUEDA) ?? '';
  } catch {
    return '';
  }
}

/** Link a Buscar con los filtros y la página de la última búsqueda. */
export const linkAResultados = () => {
  const q = leerUltimaBusqueda();
  return q ? `/buscar?${q}` : '/buscar';
};
