import {
  leerUltimaBusqueda,
  guardarUltimaBusqueda,
  tourVisto,
  marcarTourVisto,
} from './persistencia';

describe('UI-007: persistencia que puede fallar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('guarda y lee la última búsqueda', () => {
    guardarUltimaBusqueda('posicion=defensor&pagina=2');
    expect(leerUltimaBusqueda()).toBe('posicion=defensor&pagina=2');
  });

  it('el tour se marca como visto una vez', () => {
    expect(tourVisto()).toBe(false);
    marcarTourVisto();
    expect(tourVisto()).toBe(true);
  });

  it('si el navegador no deja guardar, no se rompe', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    vi.stubGlobal('localStorage', roto);
    vi.stubGlobal('sessionStorage', roto);
    expect(() => marcarTourVisto()).not.toThrow();
    expect(tourVisto()).toBe(false);
    expect(() => guardarUltimaBusqueda('x=1')).not.toThrow();
    expect(leerUltimaBusqueda()).toBe('');
  });
});
