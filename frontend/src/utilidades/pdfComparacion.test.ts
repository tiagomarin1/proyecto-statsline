import type { Liga, RespuestaComparacion } from '../tipos/api';
import { armarContenidoPdf, busquedaUsada, nombreArchivoPdf, textoSeguro } from './pdfComparacion';

const liga = { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' as const };
const LIGAS: Liga[] = [{ ...liga, temporada_actual: 2026 }];

const jugador = (id: number, nombre_completo: string, valor: number | null) => ({
  id,
  nombre: `${nombre_completo[0]}.`,
  nombre_completo,
  posicion: 'defensor' as const,
  edad: 20 + id,
  equipo: `Club ${id}`,
  liga,
  temporada: 2026,
  valor_mercado_eur: valor,
});

const DOS: RespuestaComparacion = {
  jugadores: [
    jugador(1, 'Santiago Arias Naranjo', 1_200_000),
    jugador(2, 'Lisandro Magallán', null),
  ],
  filas: [
    {
      metrica: 'minutos_jugados',
      etiqueta: 'Minutos jugados',
      valores: [1572, 2243],
      mejor: [2],
      peor: [1],
    },
    {
      metrica: 'pases_precision_pct',
      etiqueta: '% pases completados',
      valores: [74, 80],
      mejor: [2],
      peor: [1],
    },
    {
      metrica: 'duelos_ganados_pct',
      etiqueta: '% duelos ganados',
      valores: [61, null],
      mejor: [],
      peor: [],
    },
    { metrica: 'rating', etiqueta: 'Rating', valores: [6.69, 6.66], mejor: [1], peor: [2] },
  ],
  metricas_ganadas: { '1': 1, '2': 2 },
  diferencia_valor_eur: null,
  mas_barato_id: 1,
  aviso_fuentes: null,
};

const TRES: RespuestaComparacion = {
  ...DOS,
  jugadores: [...DOS.jugadores, jugador(3, 'Faustino Marcos Alberto Rojo', 125_000)],
  filas: DOS.filas.map((f) => ({ ...f, valores: [...f.valores, 50] })),
};

const FECHA = new Date(2026, 10, 27, 15, 30);
const base = { club: 'Deportivo Norte', fecha: FECHA, busqueda: null, notas: '' };

describe('CMP-002: contenido del PDF', () => {
  it('encabezado con club y fecha, y el pie "Generado por StatsLine el dd/mm/aaaa"', () => {
    const c = armarContenidoPdf({ ...base, comparacion: DOS });
    expect(c.encabezado).toEqual({ club: 'Deportivo Norte', fecha: '27/11/2026' });
    expect(c.pie).toBe('Generado por StatsLine el 27/11/2026');
  });

  it('el nombre del archivo lleva la fecha AAAA-MM-DD', () => {
    expect(nombreArchivoPdf(FECHA)).toBe('StatsLine-comparacion-2026-11-27.pdf');
    expect(nombreArchivoPdf(new Date(2026, 0, 5))).toBe('StatsLine-comparacion-2026-01-05.pdf');
  });

  it('jugadores con nombre completo, posición, equipo, edad y valor (o "Dato no disponible")', () => {
    const c = armarContenidoPdf({ ...base, comparacion: DOS });
    expect(c.jugadores).toEqual([
      {
        nombre: 'Santiago Arias Naranjo',
        posicion: 'Defensor',
        equipo: 'Club 1',
        edad: '21 años',
        valor: 'EUR 1.200.000',
      },
      {
        nombre: 'Lisandro Magallán',
        posicion: 'Defensor',
        equipo: 'Club 2',
        edad: '22 años',
        valor: 'Dato no disponible',
      },
    ]);
  });

  it('métrica por métrica: valor, barra (RN-037) y Mejor/Peor escritos', () => {
    const c = armarContenidoPdf({ ...base, comparacion: DOS });
    expect(c.metricas.map((m) => m.etiqueta)).toEqual([
      'Minutos jugados',
      '% pases completados',
      '% duelos ganados',
      'Rating',
    ]);
    expect(c.metricas[0].filas).toEqual([
      { nombre: 'Santiago Arias Naranjo', valor: '1.572', pct: 70.1, marca: 'Peor' },
      { nombre: 'Lisandro Magallán', valor: '2.243', pct: 100, marca: 'Mejor' },
    ]);
    expect(c.metricas[1].filas[0]).toMatchObject({ valor: '74', pct: 74 });
    expect(c.metricas[3].filas[0]).toMatchObject({ valor: '6,69', pct: 66.9, marca: 'Mejor' });
  });

  it('dato faltante: "Dato no disponible", barra vacía, sin Mejor ni Peor (RN-008)', () => {
    const c = armarContenidoPdf({ ...base, comparacion: DOS });
    expect(c.metricas[2].filas[1]).toEqual({
      nombre: 'Lisandro Magallán',
      valor: 'Dato no disponible',
      pct: 0,
      marca: null,
    });
    expect(JSON.stringify(c)).not.toMatch(/"valor":"0"|EUR 0\b/);
  });

  it('resumen por jugador (CMP-007), sin diferencia de valor ni "más barato"', () => {
    const c = armarContenidoPdf({ ...base, comparacion: DOS });
    expect(c.resumen).toEqual([
      { nombre: 'Santiago Arias Naranjo', texto: 'Gana en 1 de 4: Rating', valor: 'EUR 1.200.000' },
      {
        nombre: 'Lisandro Magallán',
        texto: 'Gana en 2 de 4: Minutos jugados, % pases completados',
        valor: 'Dato no disponible',
      },
    ]);
    expect(JSON.stringify(c)).not.toMatch(/barato|Diferencia de valor/);
  });

  it('con 3 jugadores exporta a los 3 en cada métrica', () => {
    const c = armarContenidoPdf({ ...base, comparacion: TRES });
    expect(c.jugadores).toHaveLength(3);
    c.metricas.forEach((m) => expect(m.filas).toHaveLength(3));
    expect(c.resumen.map((r) => r.nombre)).toEqual([
      'Santiago Arias Naranjo',
      'Lisandro Magallán',
      'Faustino Marcos Alberto Rojo',
    ]);
  });

  it('notas solo si el usuario escribió algo', () => {
    expect(armarContenidoPdf({ ...base, comparacion: DOS, notas: '   ' }).notas).toBeNull();
    expect(armarContenidoPdf({ ...base, comparacion: DOS, notas: ' Verlo el sábado ' }).notas).toBe(
      'Verlo el sábado',
    );
  });

  it('la búsqueda usada va solo si hay una; sin club, el encabezado no lo inventa', () => {
    const sin = armarContenidoPdf({ ...base, comparacion: DOS, club: '' });
    expect(sin.busqueda).toBeNull();
    expect(sin.encabezado.club).toBeNull();
    const con = armarContenidoPdf({ ...base, comparacion: DOS, busqueda: ['Defensor'] });
    expect(con.busqueda).toEqual(['Defensor']);
  });

  it('no incluye temporada, fuentes ni proveedores (RN-014)', () => {
    const texto = JSON.stringify(armarContenidoPdf({ ...base, comparacion: TRES, notas: 'x' }));
    expect(texto).not.toMatch(/emporada|Transfermarkt|API-Football|Sportmonks|fuente/);
  });
});

describe('CMP-002: búsqueda usada', () => {
  it('usa las mismas etiquetas que los chips de Buscar, sin orden ni página', () => {
    expect(
      busquedaUsada('posicion=defensor&liga_id=1&edad_min=20&orden=valor&pagina=2&ver=1', LIGAS),
    ).toEqual(['Defensor', 'Liga Profesional', 'Edad desde 20']);
  });
  it('sin búsqueda guardada, null', () => {
    expect(busquedaUsada('', LIGAS)).toBeNull();
    expect(busquedaUsada('ver=1&orden=valor', LIGAS)).toBeNull();
  });
  it('una liga que ya no está se nombra por su id', () => {
    expect(busquedaUsada('liga_id=9', LIGAS)).toEqual(['Liga 9']);
  });
});

describe('CMP-002: texto que entiende la fuente del PDF', () => {
  it('conserva tildes, eñes y signos del español, y cambia lo que no puede dibujar', () => {
    expect(textoSeguro('Ñandú «¿güero?» – 50 €')).toBe('Ñandú «¿güero?» – 50 €');
    expect(textoSeguro('Gol 😀 ok')).toBe('Gol ? ok');
    expect(textoSeguro('EUR 1.200')).toBe('EUR 1.200');
  });
});
