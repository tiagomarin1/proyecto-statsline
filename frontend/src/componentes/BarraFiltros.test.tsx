import { fireEvent, render, screen } from '@testing-library/react';

import BarraFiltros from './BarraFiltros';

const base = { ligas: [], onCambiar: vi.fn() };
const conFiltros = new URLSearchParams('posicion=defensor&edad_min=20');

describe('UI-006: filtros en un panel que sube (celular)', () => {
  it('en pantalla ancha el formulario se ve siempre y no hay botón "Filtros"', () => {
    render(<BarraFiltros {...base} params={new URLSearchParams()} />);
    expect(screen.getByLabelText('Nombre del jugador')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Filtros/ })).toBeNull();
  });

  it('en celular el formulario está cerrado y los chips quedan visibles arriba de la lista', () => {
    render(<BarraFiltros {...base} chica params={conFiltros} totalResultados={12} />);
    expect(screen.queryByLabelText('Nombre del jugador')).toBeNull();
    expect(screen.getByRole('button', { name: 'Filtros (2)' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Filtros aplicados' })).toBeInTheDocument();
  });

  it('"Filtros" abre el panel y "Ver N resultados" lo cierra', () => {
    render(<BarraFiltros {...base} chica params={conFiltros} totalResultados={12} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filtros (2)' }));
    expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del jugador')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver 12 resultados' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('se cierra con la "x", con Escape y tocando el fondo', () => {
    render(<BarraFiltros {...base} chica params={conFiltros} totalResultados={1} />);
    const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Filtros (2)' }));

    abrir();
    expect(screen.getByRole('button', { name: 'Ver 1 resultado' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar filtros' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    abrir();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    abrir();
    fireEvent.click(screen.getByTestId('fondo-filtros'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sin total todavía dice "Ver resultados"', () => {
    render(<BarraFiltros {...base} chica params={new URLSearchParams()} totalResultados={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    expect(screen.getByRole('button', { name: 'Ver resultados' })).toBeInTheDocument();
  });
});
