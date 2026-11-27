import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { JugadorResumen, Liga, PerfilBusqueda, RespuestaBusqueda } from '../tipos/api';
import Buscar from './Buscar';
import { ErrorApi } from '../servicios/api';
import { buscarJugadores, listarLigas } from '../servicios/jugadores';
import { guardarPerfil, obtenerPerfil } from '../servicios/perfilBusqueda';

vi.mock('../servicios/jugadores', () => ({
  buscarJugadores: vi.fn(),
  listarLigas: vi.fn().mockResolvedValue([]),
}));
vi.mock('../servicios/perfilBusqueda', () => ({
  obtenerPerfil: vi.fn().mockResolvedValue(null),
  guardarPerfil: vi.fn(),
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
    nombre: `J. ${id}`,
    nombre_completo: `Jugador ${id}`,
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

/** `/buscar` es la pantalla de filtros; `/buscar?ver=1` es la de resultados (UI-009). */
const RESULTADOS = '/buscar?ver=1';
const resultados = (extra = '') => (extra ? `${RESULTADOS}&${extra}` : RESULTADOS);

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

/** Pasa de la pantalla de filtros a la de resultados, como lo hace el usuario. */
async function verResultados() {
  fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }));
  await screen.findByRole('heading', { name: 'Candidatos' });
}

describe('UI-009: la primera pantalla son los filtros', () => {
  afterEach(() => {
    buscarMock.mockReset();
    avisarMock.mockReset();
    ligasMock.mockResolvedValue([]);
  });

  it('muestra solo los filtros: no hay candidatos, no se piden a la API y no hay plantillas', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();

    expect(await screen.findByLabelText('Nombre del jugador')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Candidatos' })).not.toBeInTheDocument();
    expect(screen.queryByText('Jugador 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Empezá con una plantilla' })).toBeNull();
    expect(screen.queryByText(/plantilla/i)).toBeNull();
    expect(buscarMock).not.toHaveBeenCalled();
  });

  it('"Ver resultados" es el botón principal y "Guardar perfil de búsqueda" el secundario', async () => {
    renderizar();
    const ver = await screen.findByRole('button', { name: 'Ver resultados' });
    const guardar = screen.getByRole('button', { name: 'Guardar perfil de búsqueda' });

    expect(ver).toHaveClass('btn--primary');
    expect(guardar).not.toHaveClass('btn--primary');
    expect(guardar).toHaveClass('btn--ghost');
  });

  it('cambiar los filtros no pide resultados hasta tocar "Ver resultados"', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    fireEvent.change(await screen.findByLabelText('Edad mínima'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Posición'), { target: { value: 'defensor' } });

    await new Promise((r) => setTimeout(r, 500));
    expect(buscarMock).not.toHaveBeenCalled();
  });

  it('"Ver resultados" aplica los filtros del formulario y muestra a los candidatos', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1), jugador(2)]));
    renderizar();
    fireEvent.change(await screen.findByLabelText('Posición'), { target: { value: 'defensor' } });
    fireEvent.change(screen.getByLabelText('Edad máxima'), { target: { value: '24' } });

    await verResultados();

    expect(await screen.findByText('Jugador 1')).toBeInTheDocument();
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
    expect(ultimosFiltros().get('posicion')).toBe('defensor');
    expect(ultimosFiltros().get('edad_max')).toBe('24');
    // `ver` es del frontend: no viaja a la API
    expect(ultimosFiltros().has('ver')).toBe(false);
    // la pantalla de filtros ya no está
    expect(screen.queryByLabelText('Edad máxima')).not.toBeInTheDocument();
  });

  it('sin ningún filtro "Ver resultados" muestra a todos los jugadores', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    await verResultados();

    expect(await screen.findByText('Jugador 1')).toBeInTheDocument();
    expect([...ultimosFiltros().keys()].sort()).toEqual(['tamano']);
  });

  it('incluye lo que se acaba de escribir aunque todavía no se haya aplicado solo', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();
    fireEvent.change(await screen.findByLabelText('Nombre del jugador'), {
      target: { value: 'arias' },
    });
    // sin esperar al instante de espera de los campos de texto
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }));

    await screen.findByText('Jugador 1');
    expect(ultimosFiltros().get('nombre')).toBe('arias');
  });

  it('pide 12 candidatos por página para llenar la grilla de tarjetas', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados());
    await screen.findByText('Jugador 1');

    expect(ultimosFiltros().get('tamano')).toBe('12');
  });
});

describe('UI-009: pantalla de resultados', () => {
  afterEach(() => {
    buscarMock.mockReset();
    avisarMock.mockReset();
    ligasMock.mockResolvedValue([]);
  });

  it('muestra el total, un chip por filtro activo y "Modificar filtros"', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('posicion=defensor&edad_min=25'));
    await screen.findByText('Jugador 1');

    expect(screen.getByText('1 resultados')).toBeInTheDocument();
    const chips = screen.getByRole('list', { name: 'Filtros aplicados' });
    expect(within(chips).getByText('Defensor')).toBeInTheDocument();
    expect(within(chips).getByText('Edad desde 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modificar filtros' })).toBeInTheDocument();
  });

  it('la x de un chip quita solo ese filtro y sigue en resultados', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('posicion=defensor&edad_min=25'));
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Defensor' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('posicion')).toBeNull();
      expect(ultimosFiltros().get('edad_min')).toBe('25');
    });
    expect(screen.getByRole('heading', { name: 'Candidatos' })).toBeInTheDocument();
  });

  it('"Limpiar todo" quita todos los filtros y sigue en resultados', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('posicion=defensor&edad_min=25'));
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('posicion')).toBeNull();
      expect(ultimosFiltros().get('edad_min')).toBeNull();
    });
    expect(screen.getByRole('heading', { name: 'Candidatos' })).toBeInTheDocument();
  });

  it('"Modificar filtros" vuelve a la primera pantalla con los filtros cargados', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('posicion=defensor&edad_min=25'));
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Modificar filtros' }));

    expect(await screen.findByLabelText('Edad mínima')).toHaveValue(25);
    expect(screen.getByLabelText('Posición')).toHaveValue('defensor');
    expect(screen.queryByText('Jugador 1')).not.toBeInTheDocument();
  });

  it('la selección para comparar se mantiene al modificar los filtros', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1), jugador(2)]));
    renderizar(resultados());
    await screen.findByText('Jugador 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Modificar filtros' }));
    await screen.findByLabelText('Edad mínima');
    const barra = screen.getByLabelText('Jugadores seleccionados para comparar');
    expect(within(barra).getByText('Jugador 1')).toBeInTheDocument();

    await verResultados();
    await screen.findByText('Jugador 2');
    expect(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' })).toBeChecked();
  });

  it('el selector "Ordenar por" está en todas las pantallas y cambia el orden', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados());
    await screen.findByText('Jugador 1');

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'valor' } });

    await waitFor(() => expect(ultimosFiltros().get('orden')).toBe('valor'));
  });

  it('sin resultados ofrece relajar el filtro (sin la frase de sugerencia)', async () => {
    buscarMock.mockResolvedValue(
      respuesta([], {
        total: 0,
        sugerencia: { filtro: 'pases_min', etiqueta: 'el mínimo de pases', cantidad: 3 },
      }),
    );
    renderizar(resultados('pases_min=99'));

    expect(
      await screen.findByText('No hay jugadores que cumplan estos filtros'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Relajar el mínimo de pases/ })).toBeInTheDocument();
    expect(screen.queryByText(/aparecen/)).not.toBeInTheDocument();
  });

  it('sin coincidencias deja limpiar los filtros y sigue en resultados', async () => {
    buscarMock.mockResolvedValue(respuesta([], { total: 0 }));
    renderizar(resultados('nombre=zzzz'));

    expect(
      await screen.findByText('No hay jugadores que cumplan estos filtros'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nombre: zzzz')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }));

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBeNull());
    expect(ultimosFiltros().has('ver')).toBe(false);
  });

  it('sin coincidencias por otro filtro ofrece relajarlo y mantiene el nombre', async () => {
    buscarMock.mockResolvedValue(
      respuesta([], {
        total: 0,
        sugerencia: { filtro: 'posicion', etiqueta: 'la posición', cantidad: 1 },
      }),
    );
    renderizar(resultados('nombre=arias&posicion=arquero'));

    fireEvent.click(await screen.findByRole('button', { name: 'Relajar la posición' }));

    await waitFor(() => expect(ultimosFiltros().get('posicion')).toBeNull());
    expect(ultimosFiltros().get('nombre')).toBe('arias');
  });

  it('mientras llegan los resultados nuevos se ven los anteriores atenuados', async () => {
    buscarMock.mockResolvedValueOnce(respuesta([jugador(1)]));
    renderizar(resultados('posicion=defensor'));
    await screen.findByText('Jugador 1');

    buscarMock.mockReturnValue(new Promise(() => {})); // el pedido queda en curso
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Defensor' }));

    await waitFor(() => expect(ultimosFiltros().get('posicion')).toBeNull());
    expect(screen.getByText('Jugador 1').closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('un 422 muestra el mensaje con la etiqueta del campo y sin resultados viejos', async () => {
    buscarMock.mockRejectedValue(
      new ErrorApi(422, {
        detalle: 'Hay datos inválidos en el pedido.',
        codigo: 'validacion',
        errores: [{ campo: 'nombre', mensaje: 'Puede tener hasta 60 caracteres.' }],
      }),
    );
    renderizar(resultados(`nombre=${'a'.repeat(61)}`));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nombre del jugador: Puede tener hasta 60 caracteres.',
    );
    expect(screen.queryByText(/resultados/)).not.toBeInTheDocument();
  });

  it('si el pedido falla muestra el error y no deja los resultados anteriores', async () => {
    buscarMock.mockResolvedValueOnce(respuesta([jugador(1)]));
    renderizar(resultados('posicion=defensor'));
    await screen.findByText('Jugador 1');

    buscarMock.mockRejectedValue(new Error('sin red'));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Defensor' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el servidor.',
    );
    expect(screen.queryByText('Jugador 1')).not.toBeInTheDocument();
  });

  it('no deja seleccionar un cuarto jugador y avisa el tope (CMP-001)', async () => {
    buscarMock.mockResolvedValue(respuesta([1, 2, 3, 4].map(jugador)));
    renderizar(resultados());

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

describe('BUS-006: rating solo con una liga elegida (RN-029)', () => {
  afterEach(() => {
    buscarMock.mockReset();
    ligasMock.mockResolvedValue([]);
  });

  it('sin liga, el selector no ofrece Rating', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados());
    await screen.findByText('Jugador 1');

    const selector = screen.getByLabelText('Ordenar por');
    expect(within(selector).queryByRole('option', { name: 'Rating' })).not.toBeInTheDocument();
  });

  it('con una liga elegida, Rating se puede ordenar', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('liga_id=1'));
    await screen.findByText('Jugador 1');

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'rating' } });

    await waitFor(() => expect(ultimosFiltros().get('orden')).toBe('rating'));
  });

  it('al quitar la liga mientras se ordena por rating, vuelve al orden por minutos', async () => {
    ligasMock.mockResolvedValue(LIGAS);
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('liga_id=1&orden=rating'));
    await screen.findByText('Jugador 1');

    fireEvent.click(await screen.findByRole('button', { name: 'Quitar filtro Liga Profesional' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('liga_id')).toBeNull();
      expect(ultimosFiltros().get('orden')).toBeNull();
    });
  });

  it('"Limpiar todo" con orden por rating también vuelve al orden por minutos', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('liga_id=1&orden=rating'));
    await screen.findByText('Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('liga_id')).toBeNull();
      expect(ultimosFiltros().get('orden')).toBeNull();
    });
  });
});

describe('BUS-002: filtro de liga que llega por la URL', () => {
  afterEach(() => {
    buscarMock.mockReset();
    ligasMock.mockResolvedValue([]);
  });

  it('muestra la liga elegida aunque las ligas carguen después del formulario', async () => {
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
    await verResultados();

    expect(ultimosFiltros().get('posicion')).toBe('defensor');
    expect(ultimosFiltros().get('liga_id')).toBe('2');
  });
});

describe('BUS-004: presupuesto (RN-003)', () => {
  afterEach(() => buscarMock.mockReset());

  it('acepta cualquier monto, sin el tope de EUR 400.000 (decisión del equipo, 26/11)', async () => {
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
        errores: [{ campo: 'presupuesto_max_eur', mensaje: 'Tiene que ser mayor que 0.' }],
      }),
    );
    renderizar(resultados('presupuesto_max_eur=0'));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Presupuesto máximo (EUR): Tiene que ser mayor que 0.');
    expect(screen.queryByText(/resultados/)).not.toBeInTheDocument();
  });
});

describe('BUS-010: búsqueda por nombre (RN-035)', () => {
  afterEach(() => buscarMock.mockReset());

  it('el nombre viaja tal como se escribió, con tope de 60 caracteres en el campo', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar();

    const campo = await screen.findByLabelText('Nombre del jugador');
    expect(campo).toHaveAttribute('maxLength', '60');
    fireEvent.change(campo, { target: { value: 'S. Beltrán' } });
    await verResultados();

    // Sin normalizar: RN-035 vive solo en el backend
    expect(ultimosFiltros().get('nombre')).toBe('S. Beltrán');
  });

  it('el nombre de la URL se ve en el campo y, en resultados, en un chip que se quita solo', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    const { unmount } = renderizar('/buscar?nombre=arias&posicion=defensor');
    expect(await screen.findByLabelText('Nombre del jugador')).toHaveValue('arias');
    unmount();

    renderizar(resultados('nombre=arias&posicion=defensor'));
    await screen.findByText('Jugador 1');
    const chips = screen.getByRole('list', { name: 'Filtros aplicados' });
    expect(within(chips).getByText('Nombre: arias')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Nombre: arias' }));

    await waitFor(() => {
      expect(ultimosFiltros().get('nombre')).toBeNull();
      expect(ultimosFiltros().get('posicion')).toBe('defensor');
    });
  });

  it('"Limpiar todo" también quita el nombre', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar(resultados('nombre=arias'));
    await screen.findByText('Jugador 1');
    expect(ultimosFiltros().get('nombre')).toBe('arias');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));

    await waitFor(() => expect(ultimosFiltros().get('nombre')).toBeNull());
  });

  it('se combina con los demás filtros, sin página y conservando el orden', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?posicion=defensor&orden=valor&pagina=2');

    fireEvent.change(await screen.findByLabelText('Nombre del jugador'), {
      target: { value: 'arias' },
    });
    await verResultados();

    expect(ultimosFiltros().get('nombre')).toBe('arias');
    expect(ultimosFiltros().get('posicion')).toBe('defensor');
    expect(ultimosFiltros().get('orden')).toBe('valor');
    expect(ultimosFiltros().get('pagina')).toBeNull();
  });

  it('no pierde el espacio entre palabras mientras se escribe', async () => {
    renderizar();

    const campo = await screen.findByLabelText('Nombre del jugador');
    fireEvent.change(campo, { target: { value: 'santiago ' } });

    await new Promise((r) => setTimeout(r, 500));
    expect(campo).toHaveValue('santiago ');
  });

  it('un texto de solo espacios no manda el filtro', async () => {
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
    renderizar('/buscar?nombre=arias');

    fireEvent.change(await screen.findByLabelText('Nombre del jugador'), {
      target: { value: '   ' },
    });
    await verResultados();

    expect(ultimosFiltros().get('nombre')).toBeNull();
  });
});

describe('BUS-005: guardar y cargar el perfil de búsqueda (RN-023)', () => {
  const obtenerPerfilMock = vi.mocked(obtenerPerfil);
  const guardarPerfilMock = vi.mocked(guardarPerfil);

  const PERFIL: PerfilBusqueda = {
    posicion: 'defensor',
    liga_id: 2,
    edad_min: 20,
    edad_max: 27,
    presupuesto_max_eur: null,
    pases_min: 80,
    duelos_min: null,
    recuperaciones_min: null,
    minutos_min: null,
  };
  const RESUMEN = 'Perfil guardado: Defensor · 20-27 años · Primera Nacional';

  beforeEach(() => {
    ligasMock.mockResolvedValue(LIGAS);
    buscarMock.mockResolvedValue(respuesta([jugador(1)]));
  });

  afterEach(() => {
    buscarMock.mockReset();
    avisarMock.mockReset();
    guardarPerfilMock.mockReset();
    obtenerPerfilMock.mockReset();
    obtenerPerfilMock.mockResolvedValue(null);
    ligasMock.mockResolvedValue([]);
  });

  it('guarda los filtros de la pantalla como perfil, con los opcionales vacíos en null', async () => {
    guardarPerfilMock.mockResolvedValue(PERFIL);
    renderizar(
      '/buscar?posicion=defensor&liga_id=2&edad_min=20&edad_max=27&pases_min=80&orden=pases',
    );
    await screen.findByLabelText('Nombre del jugador');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' }));

    await waitFor(() => expect(guardarPerfilMock).toHaveBeenCalledWith(PERFIL));
    await waitFor(() => expect(avisarMock).toHaveBeenCalledWith('Perfil de búsqueda guardado.'));
    expect(await screen.findByText(RESUMEN)).toBeInTheDocument();
    // guardar el perfil no pide resultados
    expect(buscarMock).not.toHaveBeenCalled();
  });

  it('con un campo obligatorio vacío lo marca y muestra el mensaje de RN-023', async () => {
    guardarPerfilMock.mockRejectedValue(
      new ErrorApi(422, {
        detalle: 'Para guardar el perfil falta elegir la liga.',
        codigo: 'validacion',
        errores: [{ campo: 'liga_id', mensaje: 'Falta elegir la liga.' }],
      }),
    );
    renderizar('/buscar?posicion=defensor&edad_min=20&edad_max=27');
    await screen.findByLabelText('Nombre del jugador');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' }));

    expect(
      await screen.findByText('Para guardar el perfil falta elegir la liga.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Liga')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Posición')).not.toHaveAttribute('aria-invalid');
    expect(avisarMock).not.toHaveBeenCalled();
  });

  it('si falta el rango de edad marca los dos campos de edad', async () => {
    guardarPerfilMock.mockRejectedValue(
      new ErrorApi(422, {
        detalle: 'Para guardar el perfil falta elegir el rango de edad.',
        codigo: 'validacion',
        errores: [{ campo: 'edad', mensaje: 'Falta elegir el rango de edad.' }],
      }),
    );
    renderizar('/buscar?posicion=defensor&liga_id=2&edad_min=20');
    await screen.findByLabelText('Nombre del jugador');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' }));

    await screen.findByText('Para guardar el perfil falta elegir el rango de edad.');
    expect(screen.getByLabelText('Edad mínima')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Edad máxima')).toHaveAttribute('aria-invalid', 'true');
  });

  it('guarda lo recién escrito aunque todavía no se haya aplicado a la URL', async () => {
    guardarPerfilMock.mockResolvedValue(PERFIL);
    renderizar('/buscar?posicion=defensor&liga_id=2&edad_min=20');
    await screen.findByLabelText('Nombre del jugador');

    fireEvent.change(screen.getByLabelText('Edad máxima'), { target: { value: '27' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' }));

    await waitFor(() =>
      expect(guardarPerfilMock).toHaveBeenCalledWith(expect.objectContaining({ edad_max: 27 })),
    );
  });

  it('sin perfil guardado no ofrece cargarlo', async () => {
    renderizar();
    await screen.findByLabelText('Nombre del jugador');

    expect(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cargar perfil guardado' }),
    ).not.toBeInTheDocument();
  });

  it('al cargar el perfil guardado llena el formulario, sin pedir resultados', async () => {
    obtenerPerfilMock.mockResolvedValue(PERFIL);
    renderizar('/buscar?nombre=Rojo&presupuesto_max_eur=500000&orden=pases');

    expect(await screen.findByText(RESUMEN)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar perfil guardado' }));

    await waitFor(() => expect(screen.getByLabelText('Edad mínima')).toHaveValue(20));
    expect(screen.getByLabelText('Posición')).toHaveValue('defensor');
    expect(screen.getByLabelText('Edad máxima')).toHaveValue(27);
    // El perfil reemplaza a los filtros que había: el nombre no es parte del perfil
    expect(screen.getByLabelText('Nombre del jugador')).toHaveValue('');
    expect(screen.getByLabelText('Presupuesto máximo (EUR)')).toHaveValue(null);
    expect(buscarMock).not.toHaveBeenCalled();

    await verResultados();
    expect(ultimosFiltros().get('posicion')).toBe('defensor');
    expect(ultimosFiltros().get('liga_id')).toBe('2');
    expect(ultimosFiltros().get('pases_min')).toBe('80');
    expect(ultimosFiltros().get('nombre')).toBeNull();
    expect(ultimosFiltros().get('orden')).toBe('pases');
  });

  it('guardar con un perfil ya guardado lo reemplaza y lo avisa', async () => {
    obtenerPerfilMock.mockResolvedValue(PERFIL);
    const nuevo: PerfilBusqueda = { ...PERFIL, posicion: 'delantero', liga_id: 1, pases_min: null };
    guardarPerfilMock.mockResolvedValue(nuevo);
    renderizar('/buscar?posicion=delantero&liga_id=1&edad_min=20&edad_max=27');
    await screen.findByText(RESUMEN);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' }));

    await waitFor(() =>
      expect(avisarMock).toHaveBeenCalledWith(
        'Perfil guardado. Reemplaza al anterior: en el MVP hay un solo perfil.',
      ),
    );
    expect(
      await screen.findByText('Perfil guardado: Delantero · 20-27 años · Liga Profesional'),
    ).toBeInTheDocument();
  });

  it('si guardar falla por otra causa lo avisa y no cambia el perfil guardado', async () => {
    obtenerPerfilMock.mockResolvedValue(PERFIL);
    guardarPerfilMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderizar('/buscar?posicion=delantero&liga_id=1&edad_min=20&edad_max=27');
    await screen.findByText(RESUMEN);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' }));

    await waitFor(() =>
      expect(avisarMock).toHaveBeenCalledWith('No se pudo guardar el perfil de búsqueda.'),
    );
    expect(screen.getByText(RESUMEN)).toBeInTheDocument();
  });
});

describe('CMP-005: llegar a Buscar desde "Comparar con…"', () => {
  beforeEach(() => avisarMock.mockReset());

  it('deja al jugador de origen seleccionado y avisa a quién compararlo', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/buscar', state: { comparar: jugador(9) } }]}>
        <Buscar />
      </MemoryRouter>,
    );
    const barra = await screen.findByLabelText('Jugadores seleccionados para comparar');
    expect(within(barra).getByText('Jugador 9')).toBeInTheDocument();
    await waitFor(() => expect(avisarMock).toHaveBeenCalledWith('Elegí a quién compararlo'));
  });
});

describe('UI-007: guía en Buscar', () => {
  beforeEach(() => {
    sessionStorage.clear();
    buscarMock.mockResolvedValue(respuesta([jugador(1), jugador(2)]));
  });
  afterEach(() => buscarMock.mockReset());

  it('muestra el progreso: paso 1 sin selección y paso 2 con dos jugadores', async () => {
    renderizar(resultados());
    await screen.findByText('Jugador 1');
    const nav = screen.getByRole('navigation', { name: 'Progreso' });
    expect(within(nav).getByText('Buscar').closest('li')).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 2' }));
    expect(within(nav).getByText('Elegir').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('guarda la búsqueda, con los resultados pedidos, para "Volver a resultados"', async () => {
    renderizar('/buscar?ver=1&posicion=defensor&pagina=2');
    await screen.findByText('Jugador 1');
    expect(sessionStorage.getItem('statsline_ultima_busqueda')).toBe(
      'ver=1&posicion=defensor&pagina=2',
    );
  });

  it('"/" lleva el foco al nombre, y no actúa mientras se escribe en un campo', async () => {
    renderizar();
    await screen.findByLabelText('Nombre del jugador');
    fireEvent.keyDown(document.body, { key: '/' });
    expect(screen.getByLabelText('Nombre del jugador')).toHaveFocus();
    // con el foco en el campo, "/" y "c" son texto, no atajos
    fireEvent.keyDown(screen.getByLabelText('Nombre del jugador'), { key: 'c' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"c" abre la comparación con 2 seleccionados, y con 1 no hace nada', async () => {
    render(
      <MemoryRouter initialEntries={[resultados()]}>
        <Routes>
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/comparar" element={<p>pantalla comparar</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Jugador 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 1' }));
    fireEvent.keyDown(document.body, { key: 'c' });
    expect(screen.getByLabelText('Jugadores seleccionados para comparar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comparar a Jugador 2' }));
    fireEvent.keyDown(document.body, { key: 'c' });
    await screen.findByText('pantalla comparar');
  });

  it('"?" muestra los atajos y Escape los cierra', async () => {
    renderizar();
    await screen.findByLabelText('Nombre del jugador');
    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Atajos de teclado' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
