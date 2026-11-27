import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { JugadorResumen } from '../tipos/api';
import PanelJugador from './PanelJugador';

const JUGADOR: JugadorResumen = {
  id: 1,
  nombre: 'Ana Gómez',
  posicion: 'defensor',
  edad: 24,
  equipo: 'Club A',
  liga: { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
  temporada: 2026,
  minutos_jugados: null,
  pases_precision_pct: null,
  duelos_ganados_pct: null,
  recuperaciones_por_partido: null,
  rating: null,
  valor_mercado_eur: null,
  en_seguimiento: false,
};

describe('UI-002: panel de detalle', () => {
  it('muestra el club y la liga, sin el año de la temporada', () => {
    render(
      <MemoryRouter>
        <PanelJugador
          jugador={JUGADOR}
          filtros=""
          onCerrar={() => {}}
          onAlternarSeguimiento={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Club A · Liga Profesional')).toBeInTheDocument();
    expect(screen.queryByText(/2026/)).toBeNull();
  });

  it('CMP-005: "Comparar con…" suma al jugador a la comparación', () => {
    const onCompararCon = vi.fn();
    render(
      <MemoryRouter>
        <PanelJugador
          jugador={JUGADOR}
          filtros=""
          onCerrar={() => {}}
          onAlternarSeguimiento={() => {}}
          onCompararCon={onCompararCon}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Comparar con…' }));
    expect(onCompararCon).toHaveBeenCalledWith(JUGADOR);
  });
});
