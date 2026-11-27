import { fireEvent, render, screen } from '@testing-library/react';

import InfoMetrica from './InfoMetrica';

describe('UI-007: glosario en contexto', () => {
  it('abre y cierra la definición con el botón i', () => {
    render(<InfoMetrica metrica="duelos_ganados_pct" etiqueta="% duelos ganados" />);
    const boton = screen.getByRole('button', { name: 'Qué es % duelos ganados' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(boton);
    expect(screen.getByRole('note')).toHaveTextContent(/duelos/i);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(boton);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('Escape lo cierra', () => {
    render(<InfoMetrica metrica="rating" etiqueta="Rating" />);
    const boton = screen.getByRole('button', { name: 'Qué es Rating' });
    fireEvent.click(boton);
    fireEvent.keyDown(boton, { key: 'Escape' });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('una métrica sin definición no muestra nada', () => {
    const { container } = render(<InfoMetrica metrica="inventada" etiqueta="X" />);
    expect(container).toBeEmptyDOMElement();
  });
});
