import { DEFINICIONES } from './glosario';

describe('UI-007: glosario en contexto', () => {
  it('define todas las métricas de RN-001', () => {
    for (const m of [
      'partidos_jugados',
      'minutos_jugados',
      'goles',
      'asistencias',
      'pases_precision_pct',
      'duelos_ganados_pct',
      'recuperaciones_por_partido',
      'rating',
    ]) {
      expect(DEFINICIONES[m]).toBeTruthy();
    }
  });
  it('no menciona fuentes ni proveedores (decisión del PO, RN-029)', () => {
    Object.values(DEFINICIONES).forEach((d) => expect(d).not.toMatch(/Sportmonks|API-Football/i));
  });
});
