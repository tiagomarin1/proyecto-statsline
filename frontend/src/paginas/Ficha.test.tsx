import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AvisosProvider } from '../contexto/AvisosContext';
import { obtenerFicha } from '../servicios/jugadores';
import type { FichaJugador } from '../tipos/api';
import Ficha from './Ficha';

vi.mock('../servicios/jugadores', () => ({ obtenerFicha: vi.fn() }));
const obtenerFichaMock = vi.mocked(obtenerFicha);

const SIN_METRICAS = {
  partidos_jugados: null,
  minutos_jugados: null,
  goles: null,
  asistencias: null,
  pases_precision_pct: null,
  duelos_ganados_pct: null,
  recuperaciones_por_partido: null,
  rating: null,
};

const FICHA: FichaJugador = {
  id: 1,
  nombre: 'Ana Gómez',
  posicion: 'defensor',
  edad: 24,
  fecha_nacimiento: null,
  nacionalidad: null,
  equipo: 'Club A',
  liga: { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
  temporada: 2026,
  metricas: SIN_METRICAS,
  promedios_posicion: SIN_METRICAS,
  valor_mercado: null,
  en_seguimiento: false,
  coincidencia: null,
  trayectoria: null,
};

describe('JUG-001: ficha del jugador', () => {
  afterEach(() => obtenerFichaMock.mockReset());

  it('no muestra la temporada de los datos', async () => {
    obtenerFichaMock.mockResolvedValue(FICHA);
    render(
      <MemoryRouter initialEntries={['/ficha/1']}>
        <AvisosProvider>
          <Routes>
            <Route path="/ficha/:id" element={<Ficha />} />
          </Routes>
        </AvisosProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Ana Gómez' })).toBeInTheDocument();
    expect(screen.getByText('Liga Profesional')).toBeInTheDocument();
    expect(screen.queryByText(/Temporada/)).toBeNull();
    expect(screen.queryByText(/2026/)).toBeNull();
  });
});
