import { act, render, screen } from '@testing-library/react';

import { reiniciarTituloEscrito, TEXTO_TITULO } from '../utilidades/tituloEscrito';
import TituloEscrito from './TituloEscrito';

const LETRAS = TEXTO_TITULO.length;

function simularMovimientoReducido(reducido: boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: consulta === '(prefers-reduced-motion: reduce)' ? reducido : false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const ocultas = (c: HTMLElement) => c.querySelectorAll('.tit__l.is-oculta').length;

beforeEach(() => {
  vi.useFakeTimers();
  reiniciarTituloEscrito();
  simularMovimientoReducido(false);
});
afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error: jsdom no trae matchMedia
  delete window.matchMedia;
});

describe('UI-011: título que se escribe letra por letra', () => {
  it('el h1 tiene el texto completo accesible y la parte animada está oculta a lectores', () => {
    const { container } = render(<TituloEscrito />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Fichá con datos, no a ojo.' });
    expect(h1).toHaveAttribute('aria-label', 'Fichá con datos, no a ojo.');
    expect(container.querySelector('.tit__animado')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reserva su lugar desde el principio: todas las letras están en el flujo, ocultas', () => {
    const { container } = render(<TituloEscrito />);
    expect(container.querySelectorAll('.tit__l')).toHaveLength(LETRAS);
    expect(ocultas(container)).toBe(LETRAS);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TEXTO_TITULO);
  });

  it('avanza de a una letra cada 50 ms, con cursor, y termina completo sin cursor', () => {
    const terminar = vi.fn();
    const { container } = render(<TituloEscrito onTerminar={terminar} />);
    act(() => {
      vi.advanceTimersByTime(50 * 5);
    });
    expect(ocultas(container)).toBe(LETRAS - 5);
    expect(container.querySelector('.tit__l.is-cursor')).not.toBeNull();
    expect(terminar).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50 * LETRAS + 600);
    });
    expect(ocultas(container)).toBe(0);
    expect(container.querySelector('.is-cursor')).toBeNull();
    expect(terminar).toHaveBeenCalledTimes(1);
  });

  it('dura alrededor de 1,3 s', () => {
    expect(LETRAS * 50).toBeGreaterThanOrEqual(1200);
    expect(LETRAS * 50).toBeLessThanOrEqual(1400);
  });

  it('"a ojo" se escribe dentro del <em> (conserva el dorado)', () => {
    const { container } = render(<TituloEscrito />);
    const em = container.querySelector('em') as HTMLElement;
    expect(em.textContent).toBe('a ojo');
    expect(em.querySelectorAll('.tit__l')).toHaveLength(5);
  });

  it('con movimiento reducido aparece completo y quieto', () => {
    simularMovimientoReducido(true);
    const terminar = vi.fn();
    const { container } = render(<TituloEscrito onTerminar={terminar} />);
    expect(ocultas(container)).toBe(0);
    expect(container.querySelector('.is-cursor')).toBeNull();
    expect(terminar).not.toHaveBeenCalled();
  });

  it('se escribe una sola vez por carga: al volver a la home ya está completo', () => {
    const primero = render(<TituloEscrito />);
    act(() => {
      vi.advanceTimersByTime(50 * LETRAS + 600);
    });
    primero.unmount();

    const { container } = render(<TituloEscrito />);
    expect(ocultas(container)).toBe(0);
  });

  it('si se sale de la home a la mitad, la próxima vez tampoco se reescribe', () => {
    const primero = render(<TituloEscrito />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    primero.unmount();
    const { container } = render(<TituloEscrito />);
    expect(ocultas(container)).toBe(0);
  });
});
