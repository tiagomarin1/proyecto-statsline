import { render, screen } from '@testing-library/react';

import Esqueleto from './Esqueleto';

describe('UI-005: esqueletos de carga', () => {
  it('se anuncia como "Cargando" para lectores de pantalla', () => {
    render(<Esqueleto tipo="lista" />);
    const e = screen.getByRole('status', { name: 'Cargando' });
    expect(e).toHaveAttribute('aria-busy', 'true');
  });

  it('tiene la forma del contenido: tarjetas, ficha o comparación', () => {
    const { container, rerender } = render(<Esqueleto tipo="lista" />);
    expect(container.querySelectorAll('.esq__tarjeta').length).toBe(3);
    rerender(<Esqueleto tipo="ficha" />);
    expect(container.querySelector('.esq__hero')).not.toBeNull();
    rerender(<Esqueleto tipo="comparacion" />);
    expect(container.querySelectorAll('.esq__fila').length).toBeGreaterThan(2);
  });
});
