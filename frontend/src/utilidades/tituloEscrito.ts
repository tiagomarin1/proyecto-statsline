/** UI-011: estado del título que se escribe letra por letra en el hero. */
import { reduceMovimiento } from './movimiento';

export const TEXTO_TITULO = 'Fichá con datos, no a ojo.';

// Una sola vez por carga de la página: al volver a la home dentro de la sesión ya aparece completo
let yaSeEscribio = false;

/** ¿Hay que escribir el título? Es pura (StrictMode puede llamarla dos veces): el uso se marca
 *  recién cuando empieza a escribirse, con marcarEscrito(). */
export const tocaEscribir = (): boolean => !yaSeEscribio && !reduceMovimiento();

export function marcarEscrito(): void {
  yaSeEscribio = true;
}

/** Solo para los tests: vuelve al estado de una carga nueva. */
export function reiniciarTituloEscrito(): void {
  yaSeEscribio = false;
}
