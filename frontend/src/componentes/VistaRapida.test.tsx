import { render, screen } from '@testing-library/react';

import type { JugadorResumen } from '../tipos/api';
import VistaRapida from './VistaRapida';

const base = {
  posicion: 'defensor',
  equipo: 'Club',
  liga: { id: 1, nombre: 'Liga', cobertura: 'completa' },
  temporada: 2026,
  minutos_jugados: 1000,
  en_seguimiento: false,
} as const;
const A = {
  ...base,
  id: 1,
  nombre: 'A.',
  nombre_completo: 'Ana',
  edad: 22,
  pases_precision_pct: 87,
  duelos_ganados_pct: 61,
  recuperaciones_por_partido: 4.1,
  rating: 6.8,
  valor_mercado_eur: 1_000_000,
} as JugadorResumen;
const B = {
  ...A,
  id: 2,
  nombre: 'B.',
  nombre_completo: 'Beto',
  edad: 25,
  pases_precision_pct: 83,
  duelos_ganados_pct: null,
  recuperaciones_por_partido: 4.1,
  rating: 7.1,
  valor_mercado_eur: null,
} as JugadorResumen;

describe('CMP-005: vista rápida', () => {
  it('muestra una columna por jugador con sus datos', () => {
    render(<VistaRapida seleccion={[A, B]} />);
    expect(screen.getByRole('region', { name: 'Vista rápida de la comparación' })).toBeTruthy();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.getByText('22 años')).toBeInTheDocument();
  });

  it('marca al mejor de cada métrica con RN-006, y el empate marca a todos', () => {
    render(<VistaRapida seleccion={[A, B]} />);
    // pases: Ana 87 > Beto 83
    expect(screen.getByLabelText('Pases, Ana: 87%, Mejor')).toBeInTheDocument();
    expect(screen.getByLabelText('Pases, Beto: 83%')).toBeInTheDocument();
    // rating: Beto 7,1 > Ana 6,8
    expect(screen.getByLabelText('Rating, Beto: 7.1, Mejor')).toBeInTheDocument();
    // recuperaciones empatan: los dos Mejor
    expect(
      screen.getByLabelText('Recuperaciones por partido, Ana: 4.1, Mejor'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Recuperaciones por partido, Beto: 4.1, Mejor'),
    ).toBeInTheDocument();
  });

  it('un dato faltante dice "Dato no disponible" y no compite (RN-008)', () => {
    render(<VistaRapida seleccion={[A, B]} />);
    expect(screen.getByLabelText('Duelos ganados, Beto: Dato no disponible')).toBeInTheDocument();
    expect(screen.getByLabelText('Duelos ganados, Ana: 61%')).toBeInTheDocument();
  });
});
