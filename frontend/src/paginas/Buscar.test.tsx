import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  { id: 1, nombre: 'Liga Profesional', cobertura: 'completa', temporada_actual: 2026 },
  { id: 2, nombre: 'Primera Nacional', cobertura: 'basica', temporada_actual: 2025 },
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

  it('no pierde la liga al cambiar otro filtro', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    ligasMock.mockResolvedValue(LIGAS);
    renderizar('/buscar?liga_id=2');
    await screen.findByDisplayValue('Primera Nacional');

    fireEvent.change(screen.getByLabelText('Posición'), { target: { value: 'defensor' } });

    await waitFor(() => {
      expect(ultimosFiltros().get('posicion')).toBe('defensor');
      expect(ultimosFiltros().get('liga_id')).toBe('2');
    });
  });
});

describe('BUS-004: presupuesto (RN-003)', () => {
  afterEach(() => buscarMock.mockReset());

  it('acepta cualquier monto, sin el tope de EUR 400.000 (decisión del equipo, 26/11)', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?presupuesto_max_eur=5000000');

    const campo = await screen.findByLabelText('Presupuesto máximo (EUR)');
    expect(campo).toHaveValue(5_000_000);
    expect(campo).toHaveAttribute('min', '1');
    expect(campo).not.toHaveAttribute('max');
    expect(screen.getByText('Cualquier monto, en euros.')).toBeInTheDocument();
    expect(screen.queryByText(/400\.000/)).not.toBeInTheDocument();
  });

  it('un 422 muestra el mensaje del campo y no deja los resultados viejos', async () => {
    buscarMock.mockRejectedValue(
      new ErrorApi(422, {
        detalle: 'Hay datos inválidos en el pedido.',
        codigo: 'validacion',
        errores: [
          {
            campo: 'presupuesto_max_eur',
            mensaje: 'Tiene que ser mayor que 0.',
          },
        ],
      }),
    );
    renderizar('/buscar?presupuesto_max_eur=0');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Presupuesto máximo (EUR): Tiene que ser mayor que 0.');
    expect(screen.queryByText(/resultados/)).not.toBeInTheDocument();
  });
});

describe('UI-002: filtros en vivo, tabla y panel de detalle', () => {
  afterEach(() => {
    buscarMock.mockReset();
    ligasMock.mockResolvedValue([]);
    vi.unstubAllGlobals();
  });

  it('los filtros se aplican solos, sin botón "Aplicar filtros"', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    expect(screen.queryByRole('button', { name: 'Aplicar filtros' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Edad mínima'), { target: { value: '25' } });

    await waitFor(() => expect(ultimosFiltros().get('edad_min')).toBe('25'));
  });

  it('pide 15 candidatos por página para llenar la tabla', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    expect(ultimosFiltros().get('tamano')).toBe('15');
  });

  it('muestra un chip por filtro activo y la x quita solo ese filtro', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?posicion=defensor&edad_min=25');
    await screen.findByText('Jugador 1');

    const chips = screen.getByRole('list', { name: 'Filtros aplicados' });
    expect(within(chips).getByText('Defensor')).toBeInTheDocument();
    expect(within(chips).getByText('Edad desde 25')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Defensor' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('posicion')).toBeNull();
      expect(ultimosFiltros().get('edad_min')).toBe('25');
    });
  });

  it('"Limpiar todo" quita todos los filtros', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?posicion=defensor&edad_min=25');
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('posicion')).toBeNull();
      expect(ultimosFiltros().get('edad_min')).toBeNull();
    });
  });

  it('muestra una fila por jugador y "Dato no disponible" en vez de 0 (RN-008)', async () => {
    buscarMock.mockResolvedValue(
      respuesta([
        jugador(1),
        { ...jugador(2), pases_precision_pct: null, valor_mercado_eur: null },
      ]),
    );
    renderizar();
    await screen.findByText('Jugador 1');

    const tabla = screen.getByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(3); // encabezado + 2 jugadores
    const fila2 = within(tabla).getByText('Jugador 2').closest('tr')!;
    expect(within(fila2).getAllByText('Dato no disponible').length).toBeGreaterThanOrEqual(2);
  });

  it('ordena por la columna que se toca e indica la activa', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    expect(screen.getByRole('columnheader', { name: /Min\./ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    fireEvent.click(screen.getByRole('button', { name: /Ordenar por Valor/ }));

    await waitFor(() => expect(ultimosFiltros().get('orden')).toBe('valor'));
    expect(screen.getByRole('columnheader', { name: /Valor/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('las columnas que el backend no ordena no son clicables', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    expect(screen.queryByRole('button', { name: /Ordenar por Duelos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ordenar por Recup/ })).not.toBeInTheDocument();
  });

  it('abre el detalle sin salir de la lista y lo cierra con Escape', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1), jugador(2)]));
    renderizar('/buscar?posicion=defensor');
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de Jugador 1' }));

    const panel = await screen.findByRole('complementary', { name: 'Detalle de Jugador 1' });
    expect(within(panel).getByRole('link', { name: /Ver ficha completa/ })).toHaveAttribute(
      'href',
      '/ficha/1?posicion=defensor',
    );
    expect(screen.getByText('Jugador 2')).toBeInTheDocument(); // la lista sigue a la vista

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument());
  });

  it('cierra el detalle si el jugador ya no está en la lista', async () => {
    buscarMock.mockResolvedValueOnce(respuesta([jugador(1), jugador(2)]));
    renderizar();
    await screen.findByText('Jugador 1');
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de Jugador 1' }));
    await screen.findByRole('complementary');

    buscarMock.mockResolvedValue(respuesta([jugador(2)]));
    fireEvent.change(screen.getByLabelText('Posición'), { target: { value: 'arquero' } });

    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument());
  });

  it('marcar el check no abre el detalle', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' }));

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quitar a Jugador 1/ })).toBeInTheDocument();
  });

  it('en pantalla chica muestra tarjetas y el selector de orden', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: true,
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument();
  });
});

describe('BUS-010: búsqueda por nombre (RN-035)', () => {
  afterEach(() => buscarMock.mockReset());

  it('al escribir un nombre se aplica solo y viaja tal como se escribió', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    const campo = screen.getByLabelText('Nombre del jugador');
    expect(campo).toHaveAttribute('maxLength', '60');
    fireEvent.change(campo, { target: { value: 'S. Beltrán' } });

    // Sin normalizar: RN-035 vive solo en el backend
    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBe('S. Beltrán'));
  });

  it('el nombre de la URL se ve en el campo y en un chip, y la x quita solo ese filtro', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?nombre=arias&posicion=defensor');
    await screen.findByText('Jugador 1');

    expect(screen.getByLabelText('Nombre del jugador')).toHaveValue('arias');
    const chips = screen.getByRole('list', { name: 'Filtros aplicados' });
    expect(within(chips).getByText('Nombre: arias')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Nombre: arias' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('nombre')).toBeNull();
      expect(ultimosFiltros().get('posicion')).toBe('defensor');
    });
    expect(screen.getByLabelText('Nombre del jugador')).toHaveValue('');
  });

  it('"Limpiar todo" también quita el nombre', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?nombre=arias');
    await screen.findByText('Jugador 1');
    expect(ultimosFiltros().get('nombre')).toBe('arias');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBeNull());
    expect(screen.getByLabelText('Nombre del jugador')).toHaveValue('');
  });

  it('se combina con los demás filtros, vuelve a la página 1 y conserva el orden', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?posicion=defensor&orden=valor&pagina=2');
    await screen.findByText('Jugador 1');

    fireEvent.change(screen.getByLabelText('Nombre del jugador'), { target: { value: 'arias' } });

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBe('arias'));
    expect(ultimosFiltros().get('posicion')).toBe('defensor');
    expect(ultimosFiltros().get('orden')).toBe('valor');
    expect(ultimosFiltros().get('pagina')).toBeNull();
  });

  it('no pierde el espacio entre palabras mientras se escribe', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    const campo = screen.getByLabelText('Nombre del jugador');
    fireEvent.change(campo, { target: { value: 'santiago ' } });

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBe('santiago '));
    expect(campo).toHaveValue('santiago ');
  });

  it('un texto vacío o de solo espacios no manda el filtro', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?nombre=arias');
    await screen.findByText('Jugador 1');

    fireEvent.change(screen.getByLabelText('Nombre del jugador'), { target: { value: '   ' } });

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBeNull());
  });

  it('mientras llegan los resultados nuevos se ven los anteriores atenuados', async () => {
    buscarMock.mockResolvedValueOnce(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    buscarMock.mockReturnValue(new Promise(() => {})); // el pedido queda en curso
    fireEvent.change(screen.getByLabelText('Nombre del jugador'), { target: { value: 'arias' } });

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBe('arias'));
    expect(screen.getByText('Jugador 1').closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('sin coincidencias muestra el estado vacío y deja limpiar los filtros', async () => {
    buscarMock.mockResolvedValue(respuesta([], { total: 0 }));
    renderizar('/buscar?nombre=zzzz');

    expect(
      await screen.findByText('No hay jugadores que cumplan estos filtros'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nombre: zzzz')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }));

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBeNull());
  });

  it('sin coincidencias por otro filtro ofrece relajarlo y mantiene el nombre', async () => {
    buscarMock.mockResolvedValue(
      respuesta([], {
        total: 0,
        sugerencia: { filtro: 'posicion', etiqueta: 'la posición', cantidad: 1 },
      }),
    );
    renderizar('/buscar?nombre=arias&posicion=arquero');

    fireEvent.click(await screen.findByRole('button', { name: 'Relajar la posición' }));

    await waitFor(() => expect(ultimosFiltros().get('posicion')).toBeNull());
    expect(ultimosFiltros().get('nombre')).toBe('arias');
    expect(screen.getByLabelText('Nombre del jugador')).toHaveValue('arias');
  });

  it('un 422 muestra el mensaje con la etiqueta del campo y sin resultados viejos', async () => {
    buscarMock.mockRejectedValue(
      new ErrorApi(422, {
        detalle: 'Hay datos inválidos en el pedido.',
        codigo: 'validacion',
        errores: [{ campo: 'nombre', mensaje: 'Puede tener hasta 60 caracteres.' }],
      }),
    );
    renderizar(`/buscar?nombre=${'a'.repeat(61)}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nombre del jugador: Puede tener hasta 60 caracteres.',
    );
    expect(screen.queryByText(/resultados/)).not.toBeInTheDocument();
  });

  it('si el pedido falla muestra el error y no deja los resultados anteriores', async () => {
    buscarMock.mockResolvedValueOnce(respuesta([jugador(1)]));
    renderizar();
    await screen.findByText('Jugador 1');

    buscarMock.mockRejectedValue(new Error('sin red'));
    fireEvent.change(screen.getByLabelText('Nombre del jugador'), { target: { value: 'arias' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el servidor.',
    );
    expect(screen.queryByText('Jugador 1')).not.toBeInTheDocument();
  });
});
