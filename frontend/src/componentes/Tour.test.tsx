import { fireEvent, render, screen } from '@testing-library/react';

import Tour from './Tour';

describe('UI-007: tour de bienvenida', () => {
  it('muestra 3 pasos y se recorre con Siguiente y Atrás', () => {
    render(<Tour onCerrar={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buscá' })).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atrás' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Elegí 2 o 3' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Compará' })).toBeInTheDocument();
    expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByRole('heading', { name: 'Elegí 2 o 3' })).toBeInTheDocument();
  });

  it('en el último paso "Empezar" cierra', () => {
    const onCerrar = vi.fn();
    render(<Tour onCerrar={onCerrar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('se puede saltar o cerrar con Escape', () => {
    const onCerrar = vi.fn();
    render(<Tour onCerrar={onCerrar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saltar guía' }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });
});
