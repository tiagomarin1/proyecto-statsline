/** CMP-002: dibuja el PDF de la comparación en el navegador, sin backend. jsPDF se carga con
 *  import() solo al exportar, para no sumar peso al bundle principal. El contenido lo arma
 *  utilidades/pdfComparacion.ts (función pura). */
import type { jsPDF as JsPdf } from 'jspdf';

import type { ContenidoPdf, FilaPdf } from '../utilidades/pdfComparacion';

// A4 vertical, en milímetros
const ANCHO = 210;
const ALTO = 297;
const MARGEN = 16;
const UTIL = ANCHO - MARGEN * 2;
const LIMITE = ALTO - 20; // debajo va el pie

// Paleta de la marca (hoja del 29/10). Mejor y Peor además van escritos, para imprimir en B/N
type Rgb = [number, number, number];
const GRAFITO: Rgb = [22, 24, 29];
const ORO: Rgb = [203, 161, 53];
const ORO_HONDO: Rgb = [126, 97, 24];
const GRIS: Rgb = [90, 93, 102];
const GRIS_CLARO: Rgb = [124, 127, 135];
const LINEA: Rgb = [217, 213, 203];
const PISTA: Rgb = [232, 229, 222];
const BUENO: Rgb = [21, 118, 79];
const MALO: Rgb = [163, 32, 23];

class Lienzo {
  y = MARGEN;
  constructor(readonly doc: JsPdf) {}

  color(c: Rgb) {
    this.doc.setTextColor(...c);
  }
  fuente(estilo: 'normal' | 'bold' | 'italic', tamano: number, c: Rgb = GRAFITO) {
    this.doc.setFont('helvetica', estilo);
    this.doc.setFontSize(tamano);
    this.color(c);
  }
  lineas(texto: string, ancho: number): string[] {
    return this.doc.splitTextToSize(texto, ancho) as string[];
  }
  /** Si lo que sigue no entra, pasa a una página nueva. */
  espacio(alto: number) {
    if (this.y + alto > LIMITE) {
      this.doc.addPage();
      this.y = MARGEN;
    }
  }
  titulo(texto: string) {
    this.espacio(16);
    this.y += 4;
    this.fuente('bold', 12.5);
    this.doc.text(texto, MARGEN, this.y);
    this.y += 2;
    this.doc.setDrawColor(...ORO);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGEN, this.y, MARGEN + 14, this.y);
    this.y += 6;
  }
}

/** Logotipo "statsline": la l y la i son bastas, la de la i en oro (UI-001). */
function logo(l: Lienzo, x: number, base: number) {
  const { doc } = l;
  const tam = 20;
  const em = tam * 0.3528; // puntos a mm
  l.fuente('bold', tam);
  doc.text('stats', x, base);
  let cx = x + doc.getTextWidth('stats') + em * 0.05;
  const barra = em * 0.22;
  doc.setFillColor(...GRAFITO);
  doc.roundedRect(cx, base - em * 0.73, barra, em * 0.73, barra / 2, barra / 2, 'F');
  cx += barra + em * 0.1;
  doc.setFillColor(...ORO);
  doc.roundedRect(cx, base - em * 0.5, barra, em * 0.5, barra / 2, barra / 2, 'F');
  doc.circle(cx + barra / 2, base - em * 0.68, barra / 2, 'F');
  cx += barra + em * 0.05;
  doc.text('ne', cx, base);
}

function encabezado(l: Lienzo, c: ContenidoPdf) {
  const { doc } = l;
  logo(l, MARGEN, MARGEN + 6);
  l.fuente('bold', 10.5);
  if (c.encabezado.club)
    doc.text(c.encabezado.club, ANCHO - MARGEN, MARGEN + 1.5, { align: 'right' });
  l.fuente('normal', 9.5, GRIS);
  doc.text(c.encabezado.fecha, ANCHO - MARGEN, MARGEN + 6.5, { align: 'right' });
  l.y = MARGEN + 11;
  l.fuente('normal', 9.5, GRIS);
  doc.text('Comparación de jugadores', MARGEN, l.y + 1);
  l.y += 4;
  doc.setDrawColor(...LINEA);
  doc.setLineWidth(0.3);
  doc.line(MARGEN, l.y, ANCHO - MARGEN, l.y);
  l.y += 3;
}

function jugadores(l: Lienzo, c: ContenidoPdf) {
  const { doc } = l;
  l.titulo('Jugadores comparados');
  const n = c.jugadores.length;
  const sep = 4;
  const ancho = (UTIL - sep * (n - 1)) / n;
  const bloques = c.jugadores.map((j) => {
    l.fuente('bold', 10.5);
    return { j, nombre: l.lineas(j.nombre, ancho - 8) };
  });
  const alto = 8 + Math.max(...bloques.map((b) => b.nombre.length)) * 4.6 + 4.6 * 3 + 7;
  l.espacio(alto);
  bloques.forEach(({ j, nombre }, i) => {
    const x = MARGEN + i * (ancho + sep);
    doc.setDrawColor(...LINEA);
    doc.setFillColor(251, 250, 247);
    doc.roundedRect(x, l.y, ancho, alto, 2.5, 2.5, 'FD');
    let y = l.y + 7;
    l.fuente('bold', 10.5);
    doc.text(nombre, x + 4, y);
    y += nombre.length * 4.6;
    l.fuente('normal', 9, GRIS);
    doc.text(`${j.posicion} · ${j.edad}`, x + 4, y);
    y += 4.6;
    doc.text(l.lineas(j.equipo, ancho - 8)[0], x + 4, y);
    y += 5.6;
    l.fuente('normal', 7.5, GRIS_CLARO);
    doc.text('VALOR DE MERCADO', x + 4, y);
    y += 4.6;
    const falta = j.valor === 'Dato no disponible';
    l.fuente(falta ? 'italic' : 'bold', falta ? 9 : 11.5, falta ? GRIS : GRAFITO);
    doc.text(j.valor, x + 4, y);
  });
  l.y += alto + 5;
}

function busqueda(l: Lienzo, c: ContenidoPdf) {
  if (!c.busqueda) return;
  l.titulo('Búsqueda usada');
  l.fuente('normal', 9.5, GRIS);
  const texto = l.lineas(c.busqueda.join('  ·  '), UTIL);
  l.espacio(texto.length * 4.6);
  l.doc.text(texto, MARGEN, l.y);
  l.y += texto.length * 4.6 + 1;
}

const ANCHO_NOMBRE = 62;
const ANCHO_VALOR = 34;
const ANCHO_MARCA = 14;
const X_BARRA = MARGEN + ANCHO_NOMBRE + 3;
const ANCHO_BARRA = UTIL - ANCHO_NOMBRE - 3 - ANCHO_MARCA - ANCHO_VALOR - 4;

function fila(l: Lienzo, f: FilaPdf) {
  const { doc } = l;
  l.fuente('normal', 9);
  const nombre = l.lineas(f.nombre, ANCHO_NOMBRE);
  const alto = Math.max(1, nombre.length) * 4 + 1.6;
  l.espacio(alto);
  const centro = l.y;
  doc.text(nombre, MARGEN, centro);
  // barra simple: la pista y el relleno hasta el valor (RN-037)
  const yb = centro - 2.6;
  doc.setFillColor(...PISTA);
  doc.roundedRect(X_BARRA, yb, ANCHO_BARRA, 3, 1.5, 1.5, 'F');
  if (f.pct > 0) {
    const tono = f.marca === 'Mejor' ? BUENO : f.marca === 'Peor' ? MALO : GRIS_CLARO;
    doc.setFillColor(...tono);
    doc.roundedRect(X_BARRA, yb, Math.max(3, (ANCHO_BARRA * f.pct) / 100), 3, 1.5, 1.5, 'F');
  }
  // "Mejor"/"Peor" escrito, no solo con color
  if (f.marca) {
    l.fuente('bold', 7.5, f.marca === 'Mejor' ? BUENO : MALO);
    doc.text(f.marca.toUpperCase(), X_BARRA + ANCHO_BARRA + 3, centro);
  }
  const falta = f.valor === 'Dato no disponible';
  l.fuente(falta ? 'italic' : 'bold', falta ? 8.5 : 10, falta ? GRIS : GRAFITO);
  doc.text(f.valor, ANCHO - MARGEN, centro, { align: 'right' });
  l.y += alto;
}

function metricas(l: Lienzo, c: ContenidoPdf) {
  l.titulo('Métrica por métrica');
  c.metricas.forEach((m, i) => {
    // la etiqueta no queda sola al pie de una página
    l.espacio(6 + c.jugadores.length * 5.6);
    // la línea separa métricas; arriba de una página nueva no hace falta
    if (i > 0 && l.y > MARGEN + 1) {
      l.doc.setDrawColor(...LINEA);
      l.doc.setLineWidth(0.2);
      l.doc.line(MARGEN, l.y - 3.2, ANCHO - MARGEN, l.y - 3.2);
    }
    l.fuente('bold', 9.5, ORO_HONDO);
    l.doc.text(m.etiqueta, MARGEN, l.y + 0.6);
    l.y += 5.4;
    m.filas.forEach((f) => fila(l, f));
    l.y += 3.4;
  });
}

function resumen(l: Lienzo, c: ContenidoPdf) {
  l.titulo('Resumen');
  c.resumen.forEach((r) => {
    l.fuente('normal', 9.5, GRIS);
    const texto = l.lineas(r.texto, UTIL - 50);
    l.espacio(6 + texto.length * 4.4);
    l.fuente('bold', 10.5);
    l.doc.text(r.nombre, MARGEN, l.y);
    const falta = r.valor === 'Dato no disponible';
    l.fuente(falta ? 'italic' : 'bold', falta ? 9 : 10.5, falta ? GRIS : GRAFITO);
    l.doc.text(r.valor, ANCHO - MARGEN, l.y, { align: 'right' });
    l.y += 4.8;
    l.fuente('normal', 9.5, GRIS);
    l.doc.text(texto, MARGEN, l.y);
    l.y += texto.length * 4.4 + 3;
  });
}

function notas(l: Lienzo, c: ContenidoPdf) {
  if (!c.notas) return;
  l.titulo('Notas');
  l.fuente('normal', 10);
  for (const linea of l.lineas(c.notas, UTIL)) {
    l.espacio(5);
    l.doc.text(linea, MARGEN, l.y);
    l.y += 4.8;
  }
}

function pies(l: Lienzo, c: ContenidoPdf) {
  const total = l.doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    l.doc.setPage(p);
    l.doc.setDrawColor(...LINEA);
    l.doc.setLineWidth(0.3);
    l.doc.line(MARGEN, ALTO - 14, ANCHO - MARGEN, ALTO - 14);
    l.fuente('normal', 8, GRIS);
    l.doc.text(c.pie, MARGEN, ALTO - 9);
    if (total > 1)
      l.doc.text(`Página ${p} de ${total}`, ANCHO - MARGEN, ALTO - 9, { align: 'right' });
  }
}

/** Arma el PDF y devuelve el Blob y la cantidad de páginas. */
export async function generarPdf(c: ContenidoPdf): Promise<{ blob: Blob; paginas: number }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Comparación de jugadores', creator: 'StatsLine' });
  const l = new Lienzo(doc);
  encabezado(l, c);
  jugadores(l, c);
  busqueda(l, c);
  metricas(l, c);
  resumen(l, c);
  notas(l, c);
  pies(l, c);
  return { blob: doc.output('blob'), paginas: doc.getNumberOfPages() };
}

/** Genera el PDF y lo descarga con su nombre (StatsLine-comparacion-AAAA-MM-DD.pdf). */
export async function descargarPdf(c: ContenidoPdf): Promise<void> {
  const { blob } = await generarPdf(c);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = c.nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // se libera después: algunos navegadores todavía leen la URL al empezar la descarga
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
