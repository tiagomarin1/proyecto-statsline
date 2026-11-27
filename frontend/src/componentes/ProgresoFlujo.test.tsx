import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ProgresoFlujo from './ProgresoFlujo';

const ver = (paso: 1 | 2 | 3) =>
  render(
    <MemoryRouter>
      <ProgresoFlujo paso={paso} volverA="/buscar?posicion=defensor" />
    </MemoryRouter>,
  );

describe('UI-007: barra de progreso del flujo', () => {
  it('marca el paso actual y muestra los tres pasos', () => {
    ver(2);
    const nav = screen.getByRole('navigation', { name: 'Progreso' });
    expect(nav).toHaveTextContent('Buscar');
    expect(nav).toHaveTextContent('Elegir');
    expect(nav).toHaveTextContent('Comparar');
    expect(screen.getByText('Elegir').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('los pasos hechos son links que conservan los filtros', () => {
    ver(3);
    expect(screen.getByRole('link', { name: /Buscar/ })).toHaveAttribute(
      'href',
      '/buscar?posicion=defensor',
    );
    expect(screen.getByRole('link', { name: /Elegir/ })).toBeInTheDocument();
    expect(screen.getByText('Comparar').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('en el paso 1 no hay links (nada hecho todavía)', () => {
    ver(1);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
