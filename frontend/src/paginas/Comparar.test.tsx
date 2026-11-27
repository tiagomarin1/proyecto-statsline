import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { RespuestaComparacion } from '../tipos/api';
import Comparar from './Comparar';
import { compararJugadores } from '../servicios/comparaciones';
import { buscarJugadores, obtenerFicha } from '../servicios/jugadores';

vi.mock('../servicios/comparaciones', () => ({ compararJugadores: vi.fn() }));
const compararMock = vi.mocked(compararJugadores);
vi.mock('../servicios/jugadores', () => ({ obtenerFicha: vi.fn(), buscarJugadores: vi.fn() }));
const buscarMock = vi.mocked(buscarJugadores);
const fichaMock = vi.mocked(obtenerFicha);

function liga() {
  return { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' as const };
}

const RESPUESTA: RespuestaComparacion = {
  jugadores: [
    {
      id: 1,
      nombre: 'Ana Gómez',
      posicion: 'defensor',
      edad: 24,
      equipo: 'Club A',
      liga: liga(),
      temporada: 2026,
      valor_mercado_eur: 1_500_000,
    },
    {
      id: 2,
      nombre: 'Beto Ruiz',
      posicion: 'defensor',
      edad: 23,
      equipo: 'Club B',
      liga: liga(),
      temporada: 2026,
      valor_mercado_eur: 900_000,
    },
  ],
  filas: [
    {
      metrica: 'pases_precision_pct',
      etiqueta: '% pases completados',
      valores: [87, 83],
      mejor: [1],
      peor: [2],
    },
    {
      metrica: 'duelos_ganados_pct',
      etiqueta: '% duelos ganados',
      valores: [61, null],
      mejor: [1],
      peor: [],
    },
  ],
  metricas_ganadas: { '1': 2, '2': 0 },
  diferencia_valor_eur: 600_000,
  mas_barato_id: 2,
  aviso_fuentes: null,
};

const AVISO =
  'El rating y los porcentajes vienen de fuentes distintas y no son directamente comparables.';

function renderizarEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Comparar />
    </MemoryRouter>,
  );
}

describe('CMP-001: comparar jugadores', () => {
  afterEach(() => compararMock.mockReset());

  it('con menos de 2 ids muestra el estado vacío y no llama al backend', () => {
    renderizarEn('/comparar?ids=1');

    expect(screen.getByText('Elegí al menos dos jugadores')).toBeInTheDocument();
    expect(compararMock).not.toHaveBeenCalled();
  });

  it('muestra encabezados, mejor/peor, dato faltante y el veredicto', async () => {
    compararMock.mockResolvedValue(RESPUESTA);
    renderizarEn('/comparar?ids=1,2');

    expect(await screen.findByRole('heading', { name: 'Ana Gómez' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beto Ruiz' })).toBeInTheDocument();
    // dato faltante en la fila de duelos (RN-008)
    expect(screen.getByText('Falta en 1')).toBeInTheDocument();
    expect(screen.getAllByText('Dato no disponible').length).toBeGreaterThan(0);
    // veredicto
    expect(screen.getByLabelText('Métricas ganadas')).toHaveTextContent(
      /Ana Gómez\s*2\s*Beto Ruiz\s*0/,
    );
    expect(screen.getByText(/es el más barato/)).toBeInTheDocument();
    // exportar PDF queda para el release 2
    expect(screen.getByText(/release 2/)).toBeInTheDocument();
    expect(compararMock).toHaveBeenCalledWith([1, 2]);
    // sin fuentes distintas no hay aviso (CMP-003)
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('no muestra la temporada: el subtítulo es "Métricas lado a lado"', async () => {
    compararMock.mockResolvedValue(RESPUESTA);
    renderizarEn('/comparar?ids=1,2');

    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.queryByText(/Temporada/)).toBeNull();
    expect(screen.getByText('Métricas lado a lado')).toBeInTheDocument();
  });

  it('CMP-003: avisa cuando los jugadores vienen de fuentes distintas y compara igual', async () => {
    compararMock.mockResolvedValue({ ...RESPUESTA, aviso_fuentes: AVISO });
    renderizarEn('/comparar?ids=1,2');

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    // la comparación sigue ahí
    expect(screen.getByLabelText('Métricas ganadas')).toHaveTextContent(
      /Ana Gómez\s*2\s*Beto Ruiz\s*0/,
    );
    // el aviso no nombra las fuentes
    expect(screen.queryByText(/Sportmonks|API-Football/i)).not.toBeInTheDocument();
  });
});

const TRES: RespuestaComparacion = {
  ...RESPUESTA,
  jugadores: [
    ...RESPUESTA.jugadores,
    {
      id: 3,
      nombre: 'Caro Díaz',
      posicion: 'defensor',
      edad: 25,
      equipo: 'Club C',
      liga: liga(),
      temporada: 2026,
      valor_mercado_eur: null,
    },
  ],
  filas: [
    {
      metrica: 'pases_precision_pct',
      etiqueta: '% pases completados',
      valores: [87, 83, 80],
      mejor: [1],
      peor: [3],
    },
    {
      metrica: 'duelos_ganados_pct',
      etiqueta: '% duelos ganados',
      valores: [61, 45, 58],
      mejor: [1],
      peor: [2],
    },
    { metrica: 'goles', etiqueta: 'Goles', valores: [1, 5, null], mejor: [2], peor: [1] },
  ],
  metricas_ganadas: { '1': 2, '2': 1, '3': 0 },
};

const PROMEDIOS = {
  partidos_jugados: 20,
  minutos_jugados: 1500,
  goles: 2,
  asistencias: 1,
  pases_precision_pct: 80,
  duelos_ganados_pct: 55,
  recuperaciones_por_partido: 4,
  rating: 6.5,
};

describe('CMP-004: barras interactivas', () => {
  beforeEach(() => {
    fichaMock.mockResolvedValue({ promedios_posicion: PROMEDIOS } as never);
    compararMock.mockResolvedValue(TRES);
  });
  afterEach(() => {
    compararMock.mockReset();
    fichaMock.mockReset();
  });

  it('cada barra se alcanza con Tab y anuncia jugador, métrica, valor y Mejor', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    const barra = await screen.findByRole('img', {
      name: 'Ana Gómez, % pases completados, 87, Mejor',
    });
    expect(barra).toHaveAttribute('tabindex', '0');
    expect(
      screen.getByRole('img', { name: 'Caro Díaz, % pases completados, 80, Peor' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Caro Díaz, Goles, Dato no disponible' }),
    ).toBeInTheDocument();
  });

  it('al enfocar una barra el tooltip muestra el valor, las diferencias y el promedio; Escape lo cierra', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    const barra = await screen.findByRole('img', {
      name: 'Ana Gómez, % pases completados, 87, Mejor',
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar promedio de la posición' }));
    await screen.findAllByTestId('marca-promedio');
    fireEvent.focus(barra);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('87');
    expect(tip).toHaveTextContent('vs. Beto Ruiz');
    expect(tip).toHaveTextContent('+4');
    expect(tip).toHaveTextContent('vs. Caro Díaz');
    expect(tip).toHaveTextContent('+7');
    expect(tip).toHaveTextContent('Promedio de la posición');
    expect(tip).toHaveTextContent('80');
    fireEvent.keyDown(barra, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('el tooltip de un dato faltante dice "Dato no disponible"', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    const barra = await screen.findByRole('img', { name: 'Caro Díaz, Goles, Dato no disponible' });
    fireEvent.focus(barra);
    expect(within(await screen.findByRole('tooltip')).getByText('Dato no disponible')).toBeTruthy();
  });

  it('la marca del promedio aparece cuando la ficha trae el promedio, y no si falla', async () => {
    const { unmount } = renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    // apagada por defecto (CMP-006)
    expect(screen.queryByTestId('marca-promedio')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar promedio de la posición' }));
    expect((await screen.findAllByTestId('marca-promedio')).length).toBeGreaterThan(0);
    unmount();

    fichaMock.mockRejectedValue(new Error('x'));
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar promedio de la posición' }));
    expect(screen.queryByTestId('marca-promedio')).toBeNull();
  });

  it('muestra el resumen en una frase', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    expect(await screen.findByText(/Ana Gómez gana en 2 de 3 métricas/)).toBeInTheDocument();
  });

  it('"Solo diferencias grandes" oculta las filas parecidas (RN-037)', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo diferencias grandes' }));
    // 87/83/80 es 8 %: se oculta. 61/45/58 es 26 %: queda.
    expect(screen.queryByRole('img', { name: /% pases completados/ })).toBeNull();
    expect(screen.getAllByRole('img', { name: /% duelos ganados/ }).length).toBe(3);
  });

  it('"Ocultar métricas sin datos" saca las filas donde falta un dato', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ocultar métricas sin datos' }));
    expect(screen.queryByRole('img', { name: /Goles/ })).toBeNull();
    expect(screen.getAllByRole('img', { name: /% pases completados/ }).length).toBe(3);
  });

  it('el grupo filtra las métricas y un filtro sin filas ofrece quitarlo', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.click(screen.getByRole('radio', { name: 'Ataque' }));
    expect(screen.queryByRole('img', { name: /% pases/ })).toBeNull();
    expect(screen.getAllByRole('img', { name: /Goles/ }).length).toBe(3);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo diferencias grandes' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ocultar métricas sin datos' }));
    expect(screen.getByText('Ninguna métrica cumple el filtro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    expect(screen.getAllByRole('img', { name: /% pases completados/ }).length).toBe(3);
  });

  it('ocultar a un jugador recalcula el resumen y no deja menos de 2', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar jugadores' }));
    const interruptorA = screen.getByRole('switch', { name: 'Mostrar a Ana Gómez' });
    expect(interruptorA).toBeChecked();
    fireEvent.click(interruptorA);
    // sin A: pases B 83 > C 80 (B mejor), duelos B 45 < C 58 (C mejor), goles B 5 (sin comparar con C)
    expect(
      await screen.findByText(/Beto Ruiz y Caro Díaz empatan en métricas/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Métricas ganadas')).toHaveTextContent(
      /Beto Ruiz\s*1\s*Caro Díaz\s*1/,
    );
    // quedan 2 visibles: no se puede ocultar a otro
    expect(screen.getByRole('switch', { name: 'Mostrar a Beto Ruiz' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Mostrar a Caro Díaz' })).toBeDisabled();
    // volver a mostrarlo
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar a Ana Gómez' }));
    expect(screen.getByRole('switch', { name: 'Mostrar a Beto Ruiz' })).toBeEnabled();
  });

  it('con 2 jugadores los interruptores están deshabilitados', async () => {
    compararMock.mockResolvedValue(RESPUESTA);
    renderizarEn('/comparar?ids=1,2');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar jugadores' }));
    expect(screen.getByRole('switch', { name: 'Mostrar a Ana Gómez' })).toBeDisabled();
  });

  it('la vista Radar muestra el gráfico y se puede volver a Barras', async () => {
    compararMock.mockResolvedValue({
      ...TRES,
      filas: [
        ...TRES.filas,
        { metrica: 'rating', etiqueta: 'Rating', valores: [6.8, 7.1, 6], mejor: [2], peor: [3] },
      ],
    });
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.click(screen.getByRole('radio', { name: 'Radar' }));
    expect(screen.getByRole('img', { name: /Radar de perfil/ })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /% pases completados, 87/ })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Barras' }));
    expect(
      screen.getByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' }),
    ).toBeInTheDocument();
  });

  it('resalta una métrica y atenúa las demás al pasar por encima', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    const barra = await screen.findByRole('img', {
      name: 'Ana Gómez, % pases completados, 87, Mejor',
    });
    fireEvent.mouseEnter(barra.closest('.mrow') as Element);
    const filas = document.querySelectorAll('.mrow');
    expect(filas[0]).not.toHaveClass('is-dim');
    expect(filas[1]).toHaveClass('is-dim');
  });

  it('resalta a un jugador y atenúa a los otros al pasar por su nombre', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    fireEvent.mouseEnter(
      screen.getByRole('heading', { name: 'Ana Gómez' }).closest('article') as Element,
    );
    expect(screen.getByRole('img', { name: 'Beto Ruiz, % pases completados, 83' })).toHaveClass(
      'is-dim',
    );
    expect(
      screen.getByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' }),
    ).not.toHaveClass('is-dim');
  });
});

describe('CMP-005: armar la comparación sin volver a Buscar', () => {
  beforeEach(() => {
    fichaMock.mockResolvedValue({ promedios_posicion: PROMEDIOS } as never);
  });
  afterEach(() => {
    compararMock.mockReset();
    fichaMock.mockReset();
    buscarMock.mockReset();
  });

  it('"Cambiar" busca por nombre y rearma la comparación con el elegido en su lugar', async () => {
    compararMock.mockResolvedValue(TRES);
    buscarMock.mockResolvedValue({
      resultados: [
        { id: 9, nombre: 'Dani Soto', equipo: 'Club D', posicion: 'defensor', edad: 22 },
      ],
    } as never);
    renderizarEn('/comparar?ids=1,2,3');
    fireEvent.click(await screen.findByRole('button', { name: 'Editar jugadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a Beto Ruiz' }));
    fireEvent.change(screen.getByLabelText('Buscar jugador por nombre'), {
      target: { value: 'dan' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Dani Soto/ }));
    await waitFor(() => expect(compararMock).toHaveBeenLastCalledWith([1, 9, 3]));
  });

  it('"Quitar" pasa de 3 a 2, y con 2 no hay "Quitar"', async () => {
    compararMock.mockResolvedValueOnce(TRES).mockResolvedValue(RESPUESTA);
    renderizarEn('/comparar?ids=1,2,3');
    fireEvent.click(await screen.findByRole('button', { name: 'Editar jugadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar a Caro Díaz' }));
    await waitFor(() => expect(compararMock).toHaveBeenLastCalledWith([1, 2]));
    await screen.findByRole('button', { name: 'Sumar jugador' });
    expect(screen.queryByRole('button', { name: /^Quitar a / })).toBeNull();
  });

  it('"Sumar jugador" aparece con 2 y no con 3', async () => {
    compararMock.mockResolvedValue(RESPUESTA);
    const { unmount } = renderizarEn('/comparar?ids=1,2');
    expect(await screen.findByRole('button', { name: 'Sumar jugador' })).toBeInTheDocument();
    unmount();
    compararMock.mockResolvedValue(TRES);
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('heading', { name: 'Caro Díaz' });
    expect(screen.queryByRole('button', { name: 'Sumar jugador' })).toBeNull();
  });

  it('"Copiar link" copia la URL y avisa "Link copiado"', async () => {
    compararMock.mockResolvedValue(RESPUESTA);
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: escribir } });
    renderizarEn('/comparar?ids=1,2');
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();
    expect(escribir).toHaveBeenCalledWith(expect.stringContaining('/comparar?ids=1,2'));
  });

  it('si no se puede copiar muestra el link para copiarlo a mano', async () => {
    compararMock.mockResolvedValue(RESPUESTA);
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('x')) },
    });
    renderizarEn('/comparar?ids=1,2');
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar link' }));
    const campo = await screen.findByLabelText('Link de la comparación');
    expect((campo as HTMLInputElement).value).toContain('/comparar?ids=1,2');
  });
});

describe('UI-007: guía en Comparar', () => {
  beforeEach(() => {
    fichaMock.mockResolvedValue({ promedios_posicion: PROMEDIOS } as never);
    compararMock.mockResolvedValue(RESPUESTA);
    sessionStorage.clear();
  });
  afterEach(() => {
    compararMock.mockReset();
    fichaMock.mockReset();
  });

  it('muestra el progreso en el paso 3 con los anteriores como links', async () => {
    renderizarEn('/comparar?ids=1,2');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    const nav = screen.getByRole('navigation', { name: 'Progreso' });
    expect(within(nav).getByText('Comparar').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
  });

  it('"Volver a resultados" conserva los filtros y la página de la última búsqueda', async () => {
    sessionStorage.setItem('statsline_ultima_busqueda', 'posicion=defensor&pagina=2');
    renderizarEn('/comparar?ids=1,2');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.getByRole('link', { name: 'Volver a resultados' })).toHaveAttribute(
      'href',
      '/buscar?posicion=defensor&pagina=2',
    );
  });

  it('cada métrica tiene su "i" con la definición', async () => {
    renderizarEn('/comparar?ids=1,2');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    fireEvent.click(screen.getByRole('button', { name: 'Qué es % pases completados' }));
    expect(screen.getByRole('note')).toHaveTextContent(/pases/i);
  });
});

describe('CMP-006: comparación en columnas', () => {
  beforeEach(() => {
    fichaMock.mockResolvedValue({ promedios_posicion: PROMEDIOS } as never);
    compararMock.mockResolvedValue(TRES);
  });
  afterEach(() => {
    compararMock.mockReset();
    fichaMock.mockReset();
  });

  it('las cabeceras van una al lado de la otra y muestran el nombre completo', async () => {
    const { container } = renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    const cabeceras = container.querySelector('.cmp__heads') as HTMLElement;
    expect(cabeceras.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    const nombres = within(cabeceras)
      .getAllByRole('heading')
      .map((h) => h.textContent);
    expect(nombres).toEqual(['Ana Gómez', 'Beto Ruiz', 'Caro Díaz']);
    // cada cabecera tiene lo esencial y el link a la ficha
    expect(within(cabeceras).getAllByRole('link', { name: /Ver ficha/ })).toHaveLength(3);
  });

  it('no usa letras (A, B, C) para nombrar a los jugadores', async () => {
    const { container } = renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.queryByText(/Jugador [ABC]\b/)).toBeNull();
    expect(container.querySelector('.bar__who')).toBeNull();
  });

  it('cada fila tiene una celda por jugador con su número y una barra proporcional a ese número', async () => {
    const { container } = renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    const ancho = (nombre: string) =>
      (screen.getByRole('img', { name: nombre }).querySelector('.celda__barra') as HTMLElement)
        .style.width;
    // porcentajes: de 0 a 100
    expect(ancho('Ana Gómez, % pases completados, 87, Mejor')).toBe('87%');
    expect(ancho('Beto Ruiz, % pases completados, 83')).toBe('83%');
    // goles: contra el mayor de la fila (5)
    expect(ancho('Ana Gómez, Goles, 1, Peor')).toBe('20%');
    expect(ancho('Beto Ruiz, Goles, 5, Mejor')).toBe('100%');
    expect(ancho('Caro Díaz, Goles, Dato no disponible')).toBe('0%');
    expect(container.querySelectorAll('.mrow').length).toBe(3);
  });

  it('el mejor es verde y el peor rojo, con su etiqueta', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    const mejor = screen.getByRole('img', { name: 'Ana Gómez, % pases completados, 87, Mejor' });
    const peor = screen.getByRole('img', { name: 'Caro Díaz, % pases completados, 80, Peor' });
    const medio = screen.getByRole('img', { name: 'Beto Ruiz, % pases completados, 83' });
    expect(mejor.closest('.celda')).toHaveClass('is-best');
    expect(peor.closest('.celda')).toHaveClass('is-worst');
    expect(medio.closest('.celda')).not.toHaveClass('is-best');
    expect(medio.closest('.celda')).not.toHaveClass('is-worst');
    expect(within(mejor.closest('.celda') as HTMLElement).getByText('Mejor')).toBeInTheDocument();
    expect(within(peor.closest('.celda') as HTMLElement).getByText('Peor')).toBeInTheDocument();
  });

  it('"Editar jugadores" muestra por jugador Cambiar, Quitar y el interruptor de visibilidad', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.queryByRole('button', { name: 'Cambiar a Ana Gómez' })).toBeNull();

    const abrir = screen.getByRole('button', { name: 'Editar jugadores' });
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(abrir);

    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    for (const nombre of ['Ana Gómez', 'Beto Ruiz', 'Caro Díaz']) {
      expect(screen.getByRole('button', { name: `Cambiar a ${nombre}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Quitar a ${nombre}` })).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: `Mostrar a ${nombre}` })).toBeInTheDocument();
    }
  });

  it('el valor de mercado va en la cabecera y la diferencia de valor abajo', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.getByText('EUR 1.500.000')).toBeInTheDocument();
    expect(screen.getByText('EUR 900.000', { selector: '.cmp__head b' })).toBeInTheDocument();
    expect(screen.getByText(/es el más barato de la comparación/)).toBeInTheDocument();
  });

  it('no queda ninguna marca de "release 2" a la vista salvo la del botón de PDF', async () => {
    renderizarEn('/comparar?ids=1,2,3');
    await screen.findByRole('heading', { name: 'Ana Gómez' });
    expect(screen.getAllByText(/release 2/)).toHaveLength(1);
  });
});
