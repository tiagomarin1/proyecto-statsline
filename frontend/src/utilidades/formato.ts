import type { Posicion, RolUsuario } from '../tipos/api';

export const POSICIONES: Record<Posicion, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  mediocampista: 'Mediocampista',
  delantero: 'Delantero',
};

export const ROLES: Record<RolUsuario, string> = {
  director_tecnico: 'Director técnico',
  director_deportivo: 'Director deportivo / Manager',
  dirigente: 'Dirigente',
  ojeador: 'Ojeador / Scout',
};

const eur = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const formatearEur = (valor: number) => eur.format(valor);

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** UI-010: coma decimal argentina y hasta 2 decimales ("6,45", "2,6", "1.890"). */
export const formatearNumero = (valor: number) => numero.format(valor);

/** UI-010: iniciales del avatar, de las dos primeras palabras ("L. Magallán" → "LM"). */
export function iniciales(nombre: string): string {
  const palabras = nombre.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toLocaleUpperCase('es-AR');
  return (palabras[0][0] + palabras[1][0]).toLocaleUpperCase('es-AR');
}

// UI-012: partículas que van en minúscula cuando no son la primera palabra del nombre
const PARTICULAS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'e',
  'da',
  'das',
  'do',
  'dos',
  'di',
  'van',
  'von',
  'der',
]);
const minuscula = (t: string) => t.toLocaleLowerCase('es-AR');
const mayuscula = (t: string) => t.toLocaleUpperCase('es-AR');

/** Una palabra toda en minúscula o toda en mayúscula todavía no tiene la forma que eligió su
 *  dueño; si ya mezcla las dos ("McDonald", "DiCaprio"), está bien escrita y no se toca. */
const sinForma = (t: string) => t === minuscula(t) || t === mayuscula(t);

function capitalizarParte(parte: string): string {
  if (!parte || !sinForma(parte)) return parte;
  const baja = minuscula(parte);
  return mayuscula(baja.charAt(0)) + baja.slice(1);
}

/** Las partes unidas por guion o apóstrofe se tratan por separado ("ana-maría", "o'brien"). */
const capitalizarPalabra = (palabra: string) =>
  palabra
    .split(/([-'’])/)
    .map(capitalizarParte)
    .join('');

/** UI-012: cómo se muestra el nombre del usuario ("tiago marin" → "Tiago Marin"). Solo para
 *  mostrarlo: lo guardado y lo que se manda a la API no cambian. No se usa para el club (puede
 *  tener siglas) ni para los jugadores (se muestran como llegan de la API). */
export function nombrePropio(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra, i) =>
      i > 0 && sinForma(palabra) && PARTICULAS.has(minuscula(palabra))
        ? minuscula(palabra)
        : capitalizarPalabra(palabra),
    )
    .join(' ');
}

/** UI-012: el primer nombre, ya con nombrePropio, para la barra y los avisos ("Hola, Tiago."). */
export const primerNombre = (nombre: string): string => nombrePropio(nombre).split(' ')[0] ?? '';
