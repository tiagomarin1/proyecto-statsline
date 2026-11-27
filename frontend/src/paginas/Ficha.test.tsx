import { fireEvent, render, screen, within } from '@testing-library/react';
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
  nombre: 'A. Gómez',
  nombre_completo: 'Ana Gómez',
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
          {pathname}{' '}
          {(state as { comparar?: { nombre_completo: string } } | null)?.comparar?.nombre_completo}
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

  it('UI-009: no manda a la API ni "ver", ni el orden ni la página, y vuelve a los resultados', async () => {
    obtenerFichaMock.mockResolvedValue(FICHA);
    render(
      <MemoryRouter initialEntries={['/ficha/1?ver=1&posicion=defensor&orden=valor&pagina=2']}>
        <AvisosProvider>
          <Routes>
            <Route path="/ficha/:id" element={<Ficha />} />
          </Routes>
        </AvisosProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Ana Gómez' });

    const enviados = obtenerFichaMock.mock.lastCall![1];
    expect([...enviados.keys()]).toEqual(['posicion']);
    expect(screen.getByRole('link', { name: /Volver a resultados/ })).toHaveAttribute(
      'href',
      '/buscar?ver=1&posicion=defensor&orden=valor&pagina=2',
    );
  });
});

describe('UI-010: ficha rediseñada', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    obtenerFichaMock.mockReset();
  });

  const CON_DATOS: FichaJugador = {
    ...FICHA,
    nombre: 'N. Ferreyra',
    nombre_completo: 'Nahuel Ferreyra',
    nacionalidad: 'Argentina',
    valor_mercado: { eur: 850000, fecha: '2026-07-06', fuente: 'Transfermarkt' },
    metricas: {
      partidos_jugados: 28,
      minutos_jugados: 2410,
      goles: 3,
      asistencias: 2,
      pases_precision_pct: 72,
      duelos_ganados_pct: 61.5,
      recuperaciones_por_partido: null,
      rating: 6.45,
    },
    promedios_posicion: {
      partidos_jugados: 20,
      minutos_jugados: 1500,
      goles: 3,
      asistencias: 1,
      pases_precision_pct: 80,
      duelos_ganados_pct: 55,
      recuperaciones_por_partido: 4,
      rating: 6.5,
    },
  };

  function ver(ficha: FichaJugador) {
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

  it('la cabecera tiene el avatar con las iniciales y el nombre completo', async () => {
    const { container } = ver(CON_DATOS);
    expect(await screen.findByRole('heading', { level: 1, name: 'Nahuel Ferreyra' })).toBeTruthy();
    const avatar = container.querySelector('.avatar') as HTMLElement;
    expect(avatar).toHaveTextContent('NF');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('muestra cuatro datos clave: edad, minutos, rating y partidos, con formato argentino', async () => {
    ver(CON_DATOS);
    const clave = await screen.findByRole('region', { name: 'Datos clave' });
    expect(within(clave).getByText('Edad')).toBeInTheDocument();
    expect(within(clave).getByText('24 años')).toBeInTheDocument();
    expect(within(clave).getByText('2.410')).toBeInTheDocument();
    expect(within(clave).getByText('6,45')).toBeInTheDocument();
    expect(within(clave).getByText('28')).toBeInTheDocument();
  });

  it('un dato clave que falta dice "Dato no disponible" y nunca 0 (RN-008)', async () => {
    ver({ ...CON_DATOS, edad: null, metricas: { ...CON_DATOS.metricas, rating: null } });
    const clave = await screen.findByRole('region', { name: 'Datos clave' });
    expect(within(clave).getAllByText('Dato no disponible')).toHaveLength(2);
  });

  it('cada métrica muestra su número grande y cuánto está sobre o bajo el promedio', async () => {
    ver(CON_DATOS);
    await screen.findByRole('heading', { name: 'Métricas de rendimiento' });
    const pases = screen.getByText('% pases completados').closest('.mitem') as HTMLElement;
    expect(within(pases).getByText('72%')).toBeInTheDocument();
    expect(within(pases).getByText('8 por debajo del promedio')).toBeInTheDocument();
    const duelos = screen.getByText('Duelos ganados').closest('.mitem') as HTMLElement;
    expect(within(duelos).getByText('61,5%')).toBeInTheDocument();
    expect(within(duelos).getByText('6,5 por encima del promedio')).toBeInTheDocument();
    const goles = screen.getByText('Goles').closest('.mitem') as HTMLElement;
    expect(within(goles).getByText('En el promedio')).toBeInTheDocument();
  });

  it('una métrica que la liga no publica lo dice y no compara con el promedio', async () => {
    ver(CON_DATOS);
    await screen.findByRole('heading', { name: 'Métricas de rendimiento' });
    const rec = screen.getByText('Recuperaciones por partido').closest('.mitem') as HTMLElement;
    expect(within(rec).getByText('Dato no disponible')).toBeInTheDocument();
    expect(within(rec).queryByText(/promedio/)).toBeNull();
    expect(within(rec).getByText(/no publica esta métrica/)).toBeInTheDocument();
  });

  it('la barra muestra el valor: % sobre 100 y rating sobre 10', async () => {
    const { container } = ver(CON_DATOS);
    await screen.findByRole('heading', { name: 'Métricas de rendimiento' });
    const pases = screen.getByText('% pases completados').closest('.mitem') as HTMLElement;
    expect((pases.querySelector('.mitem__fill') as HTMLElement).style.width).toBe('72%');
    const rating = screen
      .getByText('Rating', { selector: '.mitem span' })
      .closest('.mitem') as HTMLElement;
    expect((rating.querySelector('.mitem__fill') as HTMLElement).style.width).toBe('64.5%');
    expect(container.querySelectorAll('.mitem__avg').length).toBeGreaterThan(0);
  });
});
