import { render, screen, within } from '@testing-library/react';

import PorQueStatsline from './PorQueStatsline';

describe('UI-014: "Por qué StatsLine" como bento con mini demos', () => {
  it('tiene las tres razones con su título y texto, y la grande es la de los filtros', () => {
    const { container } = render(<PorQueStatsline />);
    const seccion = screen.getByRole('region', { name: 'Por qué StatsLine' });
    const tarjetas = within(seccion).getAllByRole('article');
    expect(tarjetas.map((t) => within(t).getByRole('heading').textContent)).toEqual([
      'Filtrá por lo que importa',
      'Rendimiento y presupuesto, juntos',
      'Seguimiento',
    ]);
    expect(tarjetas[0]).toHaveClass('bento__grande');
    expect(container.querySelector('.bento')).not.toBeNull();
  });

  it('cada tarjeta trae una mini demo decorativa en lugar de un ícono', () => {
    const { container } = render(<PorQueStatsline />);
    const demos = container.querySelectorAll('.mini-demo');
    expect(demos).toHaveLength(3);
    demos.forEach((d) => expect(d).toHaveAttribute('aria-hidden', 'true'));
    expect(container.querySelector('.feature__i')).toBeNull();
  });

  it('las barras van en verde, amarillo y rojo, como la comparación (CMP-007)', () => {
    const { container } = render(<PorQueStatsline />);
    const barras = [...container.querySelectorAll('.mini-barra')];
    expect(barras.map((b) => b.className)).toEqual([
      expect.stringContaining('is-best'),
      expect.stringContaining('is-medio'),
      expect.stringContaining('is-worst'),
    ]);
  });

  it('las cifras son de ejemplo: "Jugador A/B/C" y el rótulo "Ejemplo"', () => {
    render(<PorQueStatsline />);
    const seccion = screen.getByRole('region', { name: 'Por qué StatsLine' });
    expect(within(seccion).getByText('Ejemplo')).toBeInTheDocument();
    expect(seccion).toHaveTextContent('Jugador A');
    expect(seccion).toHaveTextContent('Jugador C');
  });
});
