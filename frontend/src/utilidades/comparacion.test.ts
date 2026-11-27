import type { FilaComparacion } from '../tipos/api';
import { formatearEur } from './formato';
import {
  diferenciaGrande,
  grupoDeMetrica,
  mejorYPeor,
  puntosRadar,
  resumenComparacion,
  porcentajeBarra,
} from './comparacion';

describe('CMP-004 / RN-037: diferencia grande', () => {
  it('87, 83, 80 no es grande (8 %)', () => {
    expect(diferenciaGrande([87, 83, 80])).toBe(false);
  });
  it('61 y 45 es grande (26 %)', () => {
    expect(diferenciaGrande([61, 45])).toBe(true);
  });
  it('justo 10 % cuenta como grande', () => {
    expect(diferenciaGrande([100, 90])).toBe(true);
  });
  it('con máximo 0 no es grande', () => {
    expect(diferenciaGrande([0, 0])).toBe(false);
  });
  it('con menos de 2 valores no es grande y el null no compite', () => {
    expect(diferenciaGrande([61, null])).toBe(false);
    expect(diferenciaGrande([null, null])).toBe(false);
  });
});

describe('CMP-004 / RN-006: mejor y peor entre los visibles', () => {
  it('empate: marca todos como mejor', () => {
    expect(mejorYPeor({ 1: 87, 2: 83, 3: 87 })).toEqual({ mejor: [1, 3], peor: [2] });
  });
  it('empate total: solo mejor', () => {
    expect(mejorYPeor({ 1: 5, 2: 5 })).toEqual({ mejor: [1, 2], peor: [] });
  });
  it('sin el dato no compite; con menos de 2 no se marca a nadie', () => {
    expect(mejorYPeor({ 1: 61, 2: null })).toEqual({ mejor: [], peor: [] });
  });
});

describe('CMP-004: grupos de métricas (RN-037)', () => {
  it('asigna cada métrica a su grupo', () => {
    expect(grupoDeMetrica('goles')).toBe('ataque');
    expect(grupoDeMetrica('pases_precision_pct')).toBe('pase_defensa');
    expect(grupoDeMetrica('rating')).toBe('participacion');
    expect(grupoDeMetrica('otra')).toBe('participacion');
  });
});

describe('CMP-004: resumen en una frase', () => {
  const filas: FilaComparacion[] = [
    { metrica: 'goles', etiqueta: 'Goles', valores: [4, 2], mejor: [1], peor: [2] },
    { metrica: 'rating', etiqueta: 'Rating', valores: [6.8, 7.1], mejor: [2], peor: [1] },
    { metrica: 'asistencias', etiqueta: 'Asistencias', valores: [3, 1], mejor: [1], peor: [2] },
  ];
  const jugadores = [
    { id: 1, nombre: 'Ana Gómez', valor_mercado_eur: 1_500_000 },
    { id: 2, nombre: 'Beto Ruiz', valor_mercado_eur: 900_000 },
  ];

  it('cuenta las métricas ganadas y nombra al más barato', () => {
    const r = resumenComparacion(filas, jugadores);
    expect(r).toBe(
      `Ana Gómez gana en 2 de 3 métricas; Beto Ruiz es ${formatearEur(600_000)} más barato.`,
    );
  });

  it('con empate de ganadas lo dice', () => {
    const r = resumenComparacion(filas.slice(0, 2), jugadores);
    expect(r).toBe(
      `Ana Gómez y Beto Ruiz empatan en métricas (1 cada uno); Beto Ruiz es ${formatearEur(600_000)} más barato.`,
    );
  });

  it('sin costo comparable no habla de costo', () => {
    const r = resumenComparacion(
      filas,
      jugadores.map((j) => ({ ...j, valor_mercado_eur: null })),
    );
    expect(r).toBe('Ana Gómez gana en 2 de 3 métricas.');
  });
});

describe('CMP-004: radar', () => {
  it('normaliza a 0-100 y deja sin punto el dato faltante', () => {
    const filas: FilaComparacion[] = [
      {
        metrica: 'pases_precision_pct',
        etiqueta: '% pases',
        valores: [80, null],
        mejor: [],
        peor: [],
      },
      { metrica: 'rating', etiqueta: 'Rating', valores: [7, 6.5], mejor: [], peor: [] },
      { metrica: 'goles', etiqueta: 'Goles', valores: [3, 2], mejor: [], peor: [] },
    ];
    const ejes = puntosRadar(filas);
    expect(ejes.map((e) => e.etiqueta)).toEqual(['% pases', 'Rating']);
    expect(ejes[0].valores).toEqual([80, null]);
    expect(ejes[1].valores).toEqual([70, 65]);
  });
});

describe('CMP-006 / RN-037: lo que representa la barra', () => {
  const fila = [87, 83, 80];
  it('los porcentajes se miden de 0 a 100', () => {
    expect(porcentajeBarra('pases_precision_pct', 87, fila)).toBe(87);
    expect(porcentajeBarra('duelos_ganados_pct', 61.5, [61.5, 40])).toBe(61.5);
  });
  it('el rating se mide de 0 a 10', () => {
    expect(porcentajeBarra('rating', 6.8, [6.8, 7.1])).toBe(68);
  });
  it('los conteos se miden contra el mayor de la fila', () => {
    expect(porcentajeBarra('goles', 1, [1, 5, null])).toBe(20);
    expect(porcentajeBarra('goles', 5, [1, 5, null])).toBe(100);
    expect(porcentajeBarra('minutos_jugados', 1800, [1800, 2400])).toBe(75);
  });
  it('un 0 deja la barra vacía y, si todos valen 0, no divide por cero', () => {
    expect(porcentajeBarra('goles', 0, [0, 3])).toBe(0);
    expect(porcentajeBarra('goles', 0, [0, 0])).toBe(0);
  });
  it('sin dato la barra queda vacía (RN-008)', () => {
    expect(porcentajeBarra('goles', null, [1, 5, null])).toBe(0);
    expect(porcentajeBarra('pases_precision_pct', null, [80, null])).toBe(0);
  });
  it('nunca pasa de 100', () => {
    expect(porcentajeBarra('pases_precision_pct', 120, [120])).toBe(100);
  });
  it('la escala de los conteos con la marca del promedio incluye el promedio', () => {
    expect(porcentajeBarra('goles', 2, [2, 3], 6)).toBe(33.3);
  });
});
