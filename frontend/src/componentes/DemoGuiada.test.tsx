import { act, fireEvent, render, screen, within } from '@testing-library/react';

import DemoGuiada, { MS_POR_PASO } from './DemoGuiada';

function simularMovimientoReducido(reducido: boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: consulta === '(prefers-reduced-motion: reduce)' ? reducido : false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const pestanas = () => screen.getAllByRole('tab');
const elegida = () => pestanas().find((p) => p.getAttribute('aria-selected') === 'true');

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error: jsdom no trae matchMedia
  delete window.matchMedia;
});

describe('UI-014: "Cómo funciona" como demo guiada', () => {
  it('conserva el id y el nombre de la sección para el indicador del hero', () => {
    render(<DemoGuiada />);
    expect(screen.getByRole('region', { name: 'Cómo funciona' })).toHaveAttribute(
      'id',
      'como-funciona',
    );
  });

  it('los tres pasos son pestañas y la ventana es su panel', () => {
    render(<DemoGuiada />);
    expect(screen.getByRole('tablist', { name: 'Pasos' })).toBeInTheDocument();
    expect(pestanas().map((p) => within(p).getByText(/·/).textContent)).toEqual([
      '1 · Buscá',
      '2 · Elegí 2 o 3',
      '3 · Compará',
    ]);
    expect(elegida()).toBe(pestanas()[0]);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', pestanas()[0].id);
    expect(panel).toHaveTextContent('/buscar');
    expect(within(panel).getByText('Ver resultados')).toBeInTheDocument();
  });

  it('avanza sola cada 4 segundos y vuelve a empezar', () => {
    render(<DemoGuiada />);
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO);
    });
    expect(elegida()).toBe(pestanas()[1]);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Comparar 2');
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO);
    });
    expect(elegida()).toBe(pestanas()[2]);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Exportar PDF');
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO);
    });
    expect(elegida()).toBe(pestanas()[0]);
    expect(MS_POR_PASO).toBe(4000);
  });

  it('tocar un paso lo muestra y frena el avance', () => {
    render(<DemoGuiada />);
    fireEvent.click(pestanas()[2]);
    expect(elegida()).toBe(pestanas()[2]);
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO * 3);
    });
    expect(elegida()).toBe(pestanas()[2]);
  });

  it('con las flechas se pasa de una pestaña a la otra', () => {
    render(<DemoGuiada />);
    fireEvent.keyDown(pestanas()[0], { key: 'ArrowRight' });
    expect(elegida()).toBe(pestanas()[1]);
    expect(pestanas()[1]).toHaveFocus();
    fireEvent.keyDown(pestanas()[1], { key: 'ArrowLeft' });
    fireEvent.keyDown(pestanas()[0], { key: 'ArrowLeft' });
    expect(elegida()).toBe(pestanas()[2]);
  });

  it('"Pausar demo" la frena y "Reproducir demo" la retoma', () => {
    render(<DemoGuiada />);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar demo' }));
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO * 2);
    });
    expect(elegida()).toBe(pestanas()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir demo' }));
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO);
    });
    expect(elegida()).toBe(pestanas()[1]);
  });

  it('con movimiento reducido no avanza sola ni ofrece pausar', () => {
    simularMovimientoReducido(true);
    render(<DemoGuiada />);
    act(() => {
      vi.advanceTimersByTime(MS_POR_PASO * 2);
    });
    expect(elegida()).toBe(pestanas()[0]);
    expect(screen.queryByRole('button', { name: /demo/ })).toBeNull();
  });

  it('la mini pantalla es decorativa y las cifras son de ejemplo', () => {
    const { container } = render(<DemoGuiada />);
    expect(container.querySelector('.demo__pantalla')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(pestanas()[2]);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Jugador A');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Ejemplo');
  });
});
