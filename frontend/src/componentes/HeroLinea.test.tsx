import { render, screen, within } from '@testing-library/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MemoryRouter } from 'react-router-dom';

import { HeroLinea } from './HeroLinea';

type Modo = 'escritorio' | 'movil' | 'reducido';

/** jsdom no trae matchMedia: se simula según el modo que se quiere probar. */
function simularPantalla(modo: Modo) {
  window.matchMedia = vi.fn((consulta: string) => {
    const sinMovimiento = consulta.includes('no-preference');
    const reducido = consulta === '(prefers-reduced-motion: reduce)';
    let coincide = false;
    if (reducido) coincide = modo === 'reducido';
    else if (sinMovimiento && consulta.includes('min-width')) coincide = modo === 'escritorio';
    else if (sinMovimiento && consulta.includes('max-width')) coincide = modo === 'movil';
    return {
      matches: coincide,
      media: consulta,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  });
}

function renderizar(conSesion = false) {
  return render(
    <MemoryRouter>
      <HeroLinea conSesion={conSesion} destino={conSesion ? '/buscar' : '/registro'} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  ScrollTrigger.killAll();
});

describe('UI-003: hero de la home', () => {
  it('muestra el título, la bajada, los botones y las ligas como texto real', () => {
    simularPantalla('reducido');
    renderizar();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Fichá con datos, no a ojo.',
    );
    expect(screen.getByText(/sin necesidad de un analista de datos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Empezar ahora/ })).toHaveAttribute(
      'href',
      '/registro',
    );
    expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute(
      'href',
      '/ingresar',
    );

    const ligas = screen.getByRole('list', { name: 'Ligas disponibles' });
    expect(
      within(ligas)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Liga Profesional', 'Primera Nacional', 'B Metropolitana', 'Federal A']);
  });

  it('con sesión ofrece buscar jugadores y no muestra "Ya tengo cuenta"', () => {
    simularPantalla('reducido');
    renderizar(true);

    expect(screen.getByRole('link', { name: /Buscar jugadores/ })).toHaveAttribute(
      'href',
      '/buscar',
    );
    expect(screen.queryByRole('link', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument();
  });

  it('esconde las fotos a los lectores de pantalla y no muestra ninguna nota sobre las cifras', () => {
    simularPantalla('reducido');
    const { container } = renderizar();

    expect(screen.queryByText('Datos ilustrativos')).not.toBeInTheDocument();
    container.querySelectorAll('img').forEach((img) => {
      expect(img).toHaveAttribute('alt', '');
    });
    expect(container.querySelector('.hero__fondo')).toHaveAttribute('aria-hidden', 'true');
  });

  it('con movimiento reducido no se fija ni se anima con el scroll', () => {
    simularPantalla('reducido');
    const { container } = renderizar();

    expect(ScrollTrigger.getAll()).toHaveLength(0);
    expect(container.querySelector('section.hero')).not.toHaveAttribute('data-anim');
  });

  it('en escritorio con movimiento permitido el hero se fija con el scroll', () => {
    simularPantalla('escritorio');
    const { container } = renderizar();

    const disparadores = ScrollTrigger.getAll();
    expect(disparadores).toHaveLength(1);
    expect(disparadores[0].pin).toBeTruthy();
    expect(container.querySelector('section.hero')).toHaveAttribute('data-anim', 'true');
  });

  it('en mobile con movimiento permitido también se fija, con un recorrido más corto', () => {
    simularPantalla('escritorio');
    const escritorio = renderizar();
    const largoEscritorio = ScrollTrigger.getAll()[0].vars.end;
    escritorio.unmount();

    simularPantalla('movil');
    renderizar();
    expect(ScrollTrigger.getAll()).toHaveLength(1);
    expect(ScrollTrigger.getAll()[0].vars.end).not.toEqual(largoEscritorio);
  });

  it('al desmontarse libera la animación', () => {
    simularPantalla('escritorio');
    const { unmount } = renderizar();
    expect(ScrollTrigger.getAll()).toHaveLength(1);

    unmount();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });
});
