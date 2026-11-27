import { puedeAnimar, reduceMovimiento, valorAnimado } from './movimiento';

describe('UI-005: movimiento', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('con "reducir movimiento" no se anima', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('IntersectionObserver', class {});
    expect(reduceMovimiento()).toBe(true);
    expect(puedeAnimar()).toBe(false);
  });

  it('sin "reducir movimiento" y con IntersectionObserver se anima', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('IntersectionObserver', class {});
    expect(puedeAnimar()).toBe(true);
  });

  it('la cuenta animada conserva los decimales y termina en el valor exacto', () => {
    expect(valorAnimado(87.5, 0.5)).toBe(43.8);
    expect(valorAnimado(87, 0.5)).toBe(44);
    expect(valorAnimado(87.5, 1)).toBe(87.5);
  });
});
