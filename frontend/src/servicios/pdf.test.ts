import { armarContenidoPdf } from '../utilidades/pdfComparacion';
import { generarPdf } from './pdf';

const liga = { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' as const };
const jugador = (id: number, nombre_completo: string) => ({
  id,
  nombre: 'X.',
  nombre_completo,
  posicion: 'defensor' as const,
  edad: 24,
  equipo: 'Club',
  liga,
  temporada: 2026,
  valor_mercado_eur: id === 1 ? 900_000 : null,
});

describe('CMP-002: humo del PDF', () => {
  it('genera un Blob PDF (empieza con %PDF) de 1 o 2 páginas', async () => {
    const contenido = armarContenidoPdf({
      comparacion: {
        jugadores: [jugador(1, 'Ángel Fabián Di María Hernández'), jugador(2, 'Ñandú Pérez')],
        filas: [
          { metrica: 'goles', etiqueta: 'Goles', valores: [3, null], mejor: [], peor: [] },
          { metrica: 'rating', etiqueta: 'Rating', valores: [7, 6.5], mejor: [1], peor: [2] },
        ],
        metricas_ganadas: {},
        diferencia_valor_eur: null,
        mas_barato_id: null,
        aviso_fuentes: null,
      },
      club: 'Deportivo Norte',
      fecha: new Date(2026, 10, 27),
      busqueda: ['Defensor', 'Liga Profesional'],
      notas: 'Ver en vivo el sábado. '.repeat(20),
    });
    const { blob, paginas } = await generarPdf(contenido);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    const inicio = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 4));
    expect(inicio).toBe('%PDF');
    expect(paginas).toBeGreaterThanOrEqual(1);
    expect(paginas).toBeLessThanOrEqual(2);
  });
});
