import { fireEvent, render, screen } from '@testing-library/react';

import type { JugadorResumen } from '../tipos/api';
import BarraSeleccion from './BarraSeleccion';

const j = (id: number, nombre: string) =>
  ({
    id,
    nombre,
    edad: 22,
    posicion: 'defensor',
    equipo: 'Club',
    pases_precision_pct: 80,
    duelos_ganados_pct: 50,
    recuperaciones_por_partido: 3,
    rating: 6.5,
    valor_mercado_eur: null,
    minutos_jugados: 900,
  }) as JugadorResumen;

const props = { onQuitar: vi.fn(), onLimpiar: vi.fn(), onComparar: vi.fn() };

describe('CMP-005: vista rápida en la barra de selección', () => {
  it('con 1 seleccionado no hay vista rápida', () => {
    render(<BarraSeleccion seleccion={[j(1, 'Ana')]} {...props} />);
    expect(screen.queryByRole('button', { name: 'Vista rápida' })).toBeNull();
  });

  it('con 2 o 3 se abre y se cierra sin salir de la lista', () => {
    render(<BarraSeleccion seleccion={[j(1, 'Ana'), j(2, 'Beto')]} {...props} />);
    const boton = screen.getByRole('button', { name: 'Vista rápida' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(boton);
    expect(screen.getByRole('region', { name: 'Vista rápida de la comparación' })).toBeTruthy();
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(boton);
    expect(screen.queryByRole('region', { name: 'Vista rápida de la comparación' })).toBeNull();
  });
});
