/** CMP-002: contenido del PDF de la comparación, armado como datos (función pura). Lo dibuja
 *  servicios/pdf.ts con jsPDF. RN-014: sin temporada ni nombres de proveedores. */
import type { Liga, RespuestaComparacion } from '../tipos/api';
import { porcentajeBarra, resumenPorJugador } from './comparacion';
import { etiquetaFiltro, filtrosDeParams } from './filtros';
import { formatearEur, formatearNumero, POSICIONES } from './formato';

export const NOTAS_LARGO_MAXIMO = 500;
const DATO_NO_DISPONIBLE = 'Dato no disponible'; // RN-008

export interface FilaPdf {
  nombre: string;
  valor: string;
  /** relleno de la barra, de 0 a 100 (RN-037) */
  pct: number;
  marca: 'Mejor' | 'Peor' | null;
}

export interface ContenidoPdf {
  nombreArchivo: string;
  encabezado: { club: string | null; fecha: string };
  jugadores: { nombre: string; posicion: string; equipo: string; edad: string; valor: string }[];
  /** null: no hay búsqueda guardada en el navegador y la sección no va */
  busqueda: string[] | null;
  metricas: { etiqueta: string; filas: FilaPdf[] }[];
  resumen: { nombre: string; texto: string; valor: string }[];
  /** null: el usuario no escribió notas y la sección no va */
  notas: string | null;
  pie: string;
}

interface Entrada {
  comparacion: RespuestaComparacion;
  club: string | null | undefined;
  fecha: Date;
  busqueda: string[] | null;
  notas: string;
}

const dos = (n: number) => String(n).padStart(2, '0');
const fechaCorta = (f: Date) => `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}`;

/** "StatsLine-comparacion-AAAA-MM-DD.pdf", con la fecha local. */
export const nombreArchivoPdf = (f: Date) =>
  `StatsLine-comparacion-${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}.pdf`;

const valorEur = (v: number | null) =>
  v === null ? DATO_NO_DISPONIBLE : textoSeguro(formatearEur(v));

// Lo que la Helvetica estándar de jsPDF (WinAnsi) dibuja además de Latin-1
const EXTRA_WINANSI = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/** El PDF usa una fuente estándar: los espacios duros pasan a espacios y lo que no puede dibujar
 *  (emojis, otros alfabetos) pasa a "?". Tildes, eñes y signos del español quedan. */
export function textoSeguro(texto: string): string {
  return [...texto.replace(/[\u00a0\u202f]/g, ' ')]
    .map((c) => ((c.codePointAt(0) ?? 0) <= 0xff || EXTRA_WINANSI.has(c) ? c : '?'))
    .join('');
}

/** "Búsqueda usada": los filtros de la última búsqueda con las etiquetas de los chips de Buscar.
 *  Sin orden, página ni `ver`. null si no hay ninguno. */
export function busquedaUsada(query: string, ligas: Liga[]): string[] | null {
  const filtros = Object.entries(filtrosDeParams(new URLSearchParams(query)));
  if (filtros.length === 0) return null;
  return filtros.map(([nombre, valor]) => textoSeguro(etiquetaFiltro(nombre, valor, ligas)));
}

/** Arma todo el contenido. Siempre exporta a todos los jugadores y todas las métricas, con el
 *  Mejor y el Peor de la API (RN-006), aunque en pantalla haya alguien oculto o filtros. */
export function armarContenidoPdf({
  comparacion,
  club,
  fecha,
  busqueda,
  notas,
}: Entrada): ContenidoPdf {
  const { jugadores, filas } = comparacion;
  const notasLimpias = textoSeguro(notas.trim().slice(0, NOTAS_LARGO_MAXIMO));
  return {
    nombreArchivo: nombreArchivoPdf(fecha),
    encabezado: { club: club?.trim() ? textoSeguro(club.trim()) : null, fecha: fechaCorta(fecha) },
    jugadores: jugadores.map((j) => ({
      nombre: textoSeguro(j.nombre_completo),
      posicion: j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible',
      equipo: textoSeguro(j.equipo),
      edad: j.edad !== null ? `${j.edad} años` : 'Edad no disponible',
      valor: valorEur(j.valor_mercado_eur),
    })),
    busqueda: busqueda && busqueda.length > 0 ? busqueda : null,
    metricas: filas.map((f) => ({
      etiqueta: f.etiqueta,
      filas: jugadores.map((j, i) => {
        const v = f.valores[i];
        return {
          nombre: textoSeguro(j.nombre_completo),
          valor: v === null ? DATO_NO_DISPONIBLE : formatearNumero(v),
          pct: porcentajeBarra(f.metrica, v, f.valores),
          marca: f.mejor.includes(j.id) ? 'Mejor' : f.peor.includes(j.id) ? 'Peor' : null,
        };
      }),
    })),
    resumen: resumenPorJugador(filas, jugadores).map((r) => ({
      nombre: textoSeguro(r.nombre),
      texto: textoSeguro(r.texto),
      valor: valorEur(r.valor_mercado_eur),
    })),
    notas: notasLimpias ? notasLimpias : null,
    pie: `Generado por StatsLine el ${fechaCorta(fecha)}`,
  };
}
