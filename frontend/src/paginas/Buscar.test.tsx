import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { JugadorResumen, RespuestaBusqueda } from '../tipos/api';
import Buscar from './Buscar';
import { buscarJugadores } from '../servicios/jugadores';

vi.mock('../servicios/jugadores', () => ({
  buscarJugadores: vi.fn(),
  listarLigas: vi.fn().mockResolvedValue([]),
}));
vi.mock('../servicios/seguimiento', () => ({ alternarSeguimiento: vi.fn() }));
const avisarMock = vi.fn();
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));

const buscarMock = vi.mocked(buscarJugadores);

function jugador(id: number): JugadorResumen {
  return {
    id,
    nombre: `Jugador ${id}`,
    posicion: 'defensor',
    edad: 24,
    equipo: 'Club',
    liga: { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
    temporada: 2026,
    minutos_jugados: 2000,
    pases_precision_pct: 80,
    duelos_ganados_pct: 60,
    recuperaciones_por_partido: 1.5,
    rating: 7,
    valor_mercado_eur: 1_000_000,
    en_seguimiento: false,
  };
}

function respuesta(
  resultados: JugadorResumen[],
  extra: Partial<RespuestaBusqueda> = {},
): RespuestaBusqueda {
  return {
    resultados,
    total: resultados.length,
    pagina: 1,
    tamano: 6,
    excluidos_por_dato_faltante: 0,
    excluidos_sin_valor: 0,
    liga_sin_datos: false,
    sugerencia: null,
    ...extra,
  };
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/buscar']}>
      <Buscar />
    </MemoryRouter>,
  );
}

describe('BUS-006: búsqueda y selección', () => {
  afterEach(() => {
    buscarMock.mockReset();
    avisarMock.mockReset();
  });

  it('sin resultados ofrece relajar el filtro (sin la frase de sugerencia)', async () => {
    buscarMock.mockResolvedValue(
      respuesta([], {
        total: 0,
        sugerencia: { filtro: 'pases_min', etiqueta: 'el mínimo de pases', cantidad: 3 },
      }),
    );
    renderizar();

    expect(
      await screen.findByText('No hay jugadores que cumplan estos filtros'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Relajar el mínimo de pases/ })).toBeInTheDocument();
    expect(screen.queryByText(/aparecen/)).not.toBeInTheDocument();
  });

  it('no deja seleccionar un cuarto jugador y avisa el tope (CMP-001)', async () => {
    buscarMock.mockResolvedValue(respuesta([1, 2, 3, 4].map(jugador)));
    renderizar();

    await screen.findByText('Jugador 1');
    const checks = screen.getAllByRole('checkbox');
    expect(checks).toHaveLength(4);

    fireEvent.click(checks[0]);
    fireEvent.click(checks[1]);
    fireEvent.click(checks[2]);
    fireEvent.click(checks[3]);

    expect(avisarMock).toHaveBeenCalledWith(expect.stringContaining('hasta 3'));
    expect(checks[3]).not.toBeChecked();
  });
});
