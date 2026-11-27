import type { FichaJugador } from '../tipos/api';
import { resumenDeFicha } from './jugador';

describe('CMP-005: de la ficha al resumen para comparar', () => {
  it('copia lo que el comparador y la barra necesitan', () => {
    const ficha = {
      id: 7,
      nombre: 'A. Gómez',
      nombre_completo: 'Ana Gómez',
      posicion: 'defensor',
      edad: 24,
      equipo: 'Club A',
      liga: { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
      temporada: 2026,
      metricas: {
        partidos_jugados: 20,
        minutos_jugados: 1800,
        goles: 1,
        asistencias: 2,
        pases_precision_pct: 85,
        duelos_ganados_pct: null,
        recuperaciones_por_partido: 4.2,
        rating: 6.9,
      },
      valor_mercado: { eur: 900000, fecha: '2026-07-06', fuente: 'Transfermarkt' },
      en_seguimiento: true,
    } as unknown as FichaJugador;
    expect(resumenDeFicha(ficha)).toMatchObject({
      id: 7,
      nombre: 'A. Gómez',
      nombre_completo: 'Ana Gómez',
      minutos_jugados: 1800,
      pases_precision_pct: 85,
      duelos_ganados_pct: null,
      valor_mercado_eur: 900000,
      en_seguimiento: true,
    });
  });
  it('sin valor de mercado queda en null (RN-008)', () => {
    const ficha = { metricas: {}, valor_mercado: null, liga: {} } as unknown as FichaJugador;
    expect(resumenDeFicha(ficha).valor_mercado_eur).toBeNull();
  });
});
