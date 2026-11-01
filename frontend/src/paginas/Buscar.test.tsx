import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { JugadorResumen, Liga, RespuestaBusqueda } from '../tipos/api';
import Buscar from './Buscar';
import { ErrorApi } from '../servicios/api';
import { buscarJugadores, listarLigas } from '../servicios/jugadores';

vi.mock('../servicios/jugadores', () => ({
  buscarJugadores: vi.fn(),
  listarLigas: vi.fn().mockResolvedValue([]),
}));
vi.mock('../servicios/seguimiento', () => ({ alternarSeguimiento: vi.fn() }));
const avisarMock = vi.fn();
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));

const buscarMock = vi.mocked(buscarJugadores);
const ligasMock = vi.mocked(listarLigas);

const LIGAS: Liga[] = [
  { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
  { id: 2, nombre: 'Primera Nacional', cobertura: 'basica' },
];

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

function renderizar(ruta = '/buscar') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Buscar />
    </MemoryRouter>,
  );
}

/** Los filtros con los que se llamó a la API la última vez. */
function ultimosFiltros() {
  return buscarMock.mock.lastCall![0];
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

describe('BUS-002: filtro de liga que llega por la URL', () => {
  afterEach(() => {
    buscarMock.mockReset();
    ligasMock.mockResolvedValue([]);
  });

  it('muestra la liga elegida aunque las ligas carguen después del formulario', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    ligasMock.mockResolvedValue(LIGAS);
    renderizar('/buscar?liga_id=2');

    expect(await screen.findByDisplayValue('Primera Nacional')).toBeInTheDocument();
  });

  it('no pierde la liga al volver a aplicar los filtros', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    ligasMock.mockResolvedValue(LIGAS);
    renderizar('/buscar?liga_id=2');
    await screen.findByDisplayValue('Primera Nacional');

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => expect(ultimosFiltros().get('liga_id')).toBe('2'));
  });
});

describe('BUS-004: presupuesto (RN-003)', () => {
  afterEach(() => buscarMock.mockReset());

  it('limita el campo al rango de RN-003 y lo dice', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();

    const campo = await screen.findByLabelText('Presupuesto máximo (EUR)');
    expect(campo).toHaveAttribute('min', '20000');
    expect(campo).toHaveAttribute('max', '400000');
    expect(campo).toHaveAttribute('step', '5000');
    expect(screen.getByText(/De € 20\.000 a € 400\.000/)).toBeInTheDocument();
  });

  it('un 422 muestra el mensaje del campo y no deja los resultados viejos', async () => {
    buscarMock.mockRejectedValue(
      new ErrorApi(422, {
        detalle: 'Hay datos inválidos en el pedido.',
        codigo: 'validacion',
        errores: [
          {
            campo: 'presupuesto_max_eur',
            mensaje: 'Tiene que ser menor o igual a 400.000.',
          },
        ],
      }),
    );
    renderizar('/buscar?presupuesto_max_eur=3000000');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'Presupuesto máximo (EUR): Tiene que ser menor o igual a 400.000.',
    );
    expect(screen.queryByText(/resultados/)).not.toBeInTheDocument();
  });
});
