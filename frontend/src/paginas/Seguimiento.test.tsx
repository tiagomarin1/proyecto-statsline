import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { listarSeguimiento } from '../servicios/seguimiento';
import type { JugadorResumen } from '../tipos/api';
import Seguimiento from './Seguimiento';

vi.mock('../servicios/seguimiento', () => ({
  listarSeguimiento: vi.fn(),
  alternarSeguimiento: vi.fn(),
}));
vi.mock('../contexto/SesionContext', () => ({
  useSesion: () => ({ usuario: { nombre: 'Tiago', club: 'Club Demo' } }),
}));
const avisarMock = vi.fn();
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));
const listarMock = vi.mocked(listarSeguimiento);

const jugador = (id: number): JugadorResumen => ({
  id,
  nombre: `J. ${id}`,
  nombre_completo: `Jugador ${id}`,
  posicion: 'delantero',
  edad: 22,
  equipo: 'Club',
  liga: { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
  temporada: 2026,
  minutos_jugados: 1000,
  pases_precision_pct: 70,
  duelos_ganados_pct: 50,
  recuperaciones_por_partido: 2,
  rating: 6.5,
  valor_mercado_eur: 500000,
  en_seguimiento: true,
});

function ver() {
  return render(
    <MemoryRouter initialEntries={['/seguimiento']}>
      <Routes>
        <Route path="/seguimiento" element={<Seguimiento />} />
        <Route path="/comparar" element={<p>pantalla comparar</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UI-010 y CMP-001: comparar desde el seguimiento', () => {
  beforeEach(() => {
    listarMock.mockResolvedValue([1, 2, 3, 4].map(jugador));
    avisarMock.mockReset();
  });

  it('las tarjetas tienen la casilla "Comparar" y la barra aparece al elegir', async () => {
    ver();
    await screen.findByText('Jugador 1');
    expect(screen.queryByLabelText('Jugadores seleccionados para comparar')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' }));
    expect(screen.getByLabelText('Jugadores seleccionados para comparar')).toBeInTheDocument();
  });

  it('con 2 seleccionados "Comparar" lleva a la comparación con sus ids', async () => {
    ver();
    await screen.findByText('Jugador 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 2' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 4' }));

    fireEvent.click(screen.getByRole('button', { name: /^Comparar\s*2$/ }));

    expect(await screen.findByText('pantalla comparar')).toBeInTheDocument();
  });

  it('no deja elegir un cuarto y avisa el tope (RN-007)', async () => {
    ver();
    await screen.findByText('Jugador 1');
    for (const n of [1, 2, 3, 4]) {
      fireEvent.click(screen.getByRole('checkbox', { name: `Comparar a Jugador ${n}` }));
    }
    await waitFor(() =>
      expect(avisarMock).toHaveBeenCalledWith('Se pueden comparar hasta 3 jugadores a la vez.'),
    );
    expect(screen.getByRole('checkbox', { name: 'Comparar a Jugador 4' })).not.toBeChecked();
  });

  it('al quitar a alguien del seguimiento sale también de la selección', async () => {
    const { alternarSeguimiento } = await import('../servicios/seguimiento');
    vi.mocked(alternarSeguimiento).mockResolvedValue('Jugador 1 salió de la lista de seguimiento.');
    ver();
    await screen.findByText('Jugador 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' }));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Quitar de la lista de seguimiento' })[0],
    );

    await waitFor(() => expect(screen.queryByText('Jugador 1')).toBeNull());
    expect(screen.queryByLabelText('Jugadores seleccionados para comparar')).toBeNull();
  });
});
