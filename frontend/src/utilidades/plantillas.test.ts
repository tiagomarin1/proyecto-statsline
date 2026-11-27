import { PLANTILLAS } from './plantillas';
import { POSICIONES } from './formato';

const FILTROS_CONOCIDOS = [
  'posicion',
  'liga_id',
  'edad_min',
  'edad_max',
  'presupuesto_max_eur',
  'pases_min',
  'duelos_min',
  'recuperaciones_min',
  'minutos_min',
];

describe('UI-007: plantillas de búsqueda', () => {
  it('hay entre 3 y 5, con título e id únicos', () => {
    expect(PLANTILLAS.length).toBeGreaterThanOrEqual(3);
    expect(PLANTILLAS.length).toBeLessThanOrEqual(5);
    expect(new Set(PLANTILLAS.map((p) => p.id)).size).toBe(PLANTILLAS.length);
    PLANTILLAS.forEach((p) => expect(p.titulo.length).toBeGreaterThan(5));
  });

  it('usan solo filtros que ya existen y valores válidos (BUS-001 a BUS-004, RN-003)', () => {
    for (const p of PLANTILLAS) {
      for (const [nombre, valor] of Object.entries(p.filtros)) {
        expect(FILTROS_CONOCIDOS).toContain(nombre);
        expect(valor).not.toBe('');
      }
      if (p.filtros.posicion) expect(Object.keys(POSICIONES)).toContain(p.filtros.posicion);
      if (p.filtros.presupuesto_max_eur) {
        expect(Number(p.filtros.presupuesto_max_eur)).toBeGreaterThan(0);
      }
      for (const e of [p.filtros.edad_min, p.filtros.edad_max]) {
        if (e) expect(Number(e)).toBeGreaterThanOrEqual(15);
      }
    }
  });
});
