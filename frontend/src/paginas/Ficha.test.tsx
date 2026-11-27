import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

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

  it('CMP-005: "Comparar con…" lleva a Buscar con el jugador listo para comparar', async () => {
    obtenerFichaMock.mockResolvedValue(FICHA);
    function Destino() {
      const { state, pathname } = useLocation();
      return (
        <p>
          {pathname} {(state as { comparar?: { nombre: string } } | null)?.comparar?.nombre}
        </p>
      );
    }
    render(
      <MemoryRouter initialEntries={['/ficha/1?posicion=defensor']}>
        <AvisosProvider>
          <Routes>
            <Route path="/ficha/:id" element={<Ficha />} />
            <Route path="/buscar" element={<Destino />} />
          </Routes>
        </AvisosProvider>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Comparar con…' }));
    expect(await screen.findByText('/buscar Ana Gómez')).toBeInTheDocument();
  });
});

describe('UI-006: ficha por pestañas en el celular', () => {
  const COINCIDENCIA = {
    cumple: 1,
    total: 1,
    criterios: [{ criterio: 'posicion', estado: 'cumple' as const, texto: 'Juega de Defensor' }],
  };

  function renderizar(ficha: FichaJugador) {
    obtenerFichaMock.mockResolvedValue(ficha);
    return render(
      <MemoryRouter initialEntries={['/ficha/1']}>
        <AvisosProvider>
          <Routes>
            <Route path="/ficha/:id" element={<Ficha />} />
          </Routes>
        </AvisosProvider>
      </MemoryRouter>,
    );
  }
  const chica = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('max-width: 767px') ? matches : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  afterEach(() => {
    vi.unstubAllGlobals();
    obtenerFichaMock.mockReset();
  });

  it('en pantalla ancha no hay pestañas y se ve todo', async () => {
    chica(false);
    renderizar({ ...FICHA, coincidencia: COINCIDENCIA });
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Métricas de rendimiento')).toBeInTheDocument();
    expect(screen.getByText('Coincidencia con tu búsqueda')).toBeInTheDocument();
  });

  it('en celular muestra una pestaña por vez, empezando por Métricas', async () => {
    chica(true);
    renderizar({ ...FICHA, coincidencia: COINCIDENCIA });
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.getByRole('tablist', { name: 'Secciones de la ficha' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Métricas', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Métricas de rendimiento')).toBeInTheDocument();
    expect(screen.queryByText('Coincidencia con tu búsqueda')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Coincidencia' }));
    expect(screen.getByText('Coincidencia con tu búsqueda')).toBeInTheDocument();
    expect(screen.queryByText('Métricas de rendimiento')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Trayectoria' }));
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    expect(screen.queryByText('Coincidencia con tu búsqueda')).toBeNull();
  });

  it('sin filtros no hay pestaña Coincidencia', async () => {
    chica(true);
    renderizar(FICHA);
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.queryByRole('tab', { name: 'Coincidencia' })).toBeNull();
    expect(screen.getAllByRole('tab').length).toBe(2);
  });

  it('las flechas del teclado cambian de pestaña', async () => {
    chica(true);
    renderizar(FICHA);
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Métricas' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Trayectoria', selected: true })).toBeInTheDocument();
  });

  it('UI-007: muestra el progreso en el paso 2 y el "i" de cada métrica', async () => {
    obtenerFichaMock.mockResolvedValue({
      ...FICHA,
      metricas: { ...SIN_METRICAS, rating: 6.9 },
    });
    render(
      <MemoryRouter initialEntries={['/ficha/1']}>
        <AvisosProvider>
          <Routes>
            <Route path="/ficha/:id" element={<Ficha />} />
          </Routes>
        </AvisosProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    const nav = screen.getByRole('navigation', { name: 'Progreso' });
    expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent('Elegir');
    fireEvent.click(screen.getByRole('button', { name: 'Qué es Rating' }));
    expect(screen.getByRole('note')).toHaveTextContent(/0 a 10/);
  });
});
