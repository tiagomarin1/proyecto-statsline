import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { RespuestaComparacion } from '../tipos/api';
import Comparar from './Comparar';
import { compararJugadores } from '../servicios/comparaciones';

vi.mock('../servicios/comparaciones', () => ({ compararJugadores: vi.fn() }));
const compararMock = vi.mocked(compararJugadores);

function liga() {
  return { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' as const };
}

const RESPUESTA: RespuestaComparacion = {
  jugadores: [
    { id: 1, nombre: 'Ana Gómez', posicion: 'defensor', edad: 24, equipo: 'Club A', liga: liga(), temporada: 2026, valor_mercado_eur: 1_500_000 },
    { id: 2, nombre: 'Beto Ruiz', posicion: 'defensor', edad: 23, equipo: 'Club B', liga: liga(), temporada: 2026, valor_mercado_eur: 900_000 },
  ],
  filas: [
    { metrica: 'pases_precision_pct', etiqueta: '% pases completados', valores: [87, 83], mejor: [1], peor: [2] },
    { metrica: 'duelos_ganados_pct', etiqueta: '% duelos ganados', valores: [61, null], mejor: [1], peor: [] },
  ],
  metricas_ganadas: { '1': 2, '2': 0 },
  diferencia_valor_eur: 600_000,
  mas_barato_id: 2,
};

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
    expect(screen.getByText('A 2 · B 0')).toBeInTheDocument();
    expect(screen.getByText(/es el más barato/)).toBeInTheDocument();
    // exportar PDF queda para el release 2
    expect(screen.getByText(/release 2/)).toBeInTheDocument();
    expect(compararMock).toHaveBeenCalledWith([1, 2]);
  });
});
