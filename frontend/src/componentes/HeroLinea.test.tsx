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

  it('en mobile no se fija: la pelota rueda con el scroll pero el hero se scrollea normal', () => {
    simularPantalla('movil');
    const { container } = renderizar();

    const disparadores = ScrollTrigger.getAll();
    expect(disparadores).toHaveLength(1);
    expect(disparadores[0].pin).toBeFalsy();
    expect(container.querySelector('section.hero')).not.toHaveAttribute('data-anim');
  });

  it('al desmontarse libera la animación', () => {
    simularPantalla('escritorio');
    const { unmount } = renderizar();
    expect(ScrollTrigger.getAll()).toHaveLength(1);

    unmount();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
  });

  it('muestra la etiqueta corta arriba del título', () => {
    simularPantalla('reducido');
    renderizar();
    expect(screen.getByText('Para clubes del fútbol argentino')).toBeInTheDocument();
  });

  it('muestra una tarjeta de ejemplo de comparación, rotulada como ejemplo', () => {
    simularPantalla('reducido');
    renderizar();

    const tarjeta = screen.getByRole('figure', { name: 'Ejemplo de comparación' });
    expect(within(tarjeta).getByText('Ejemplo')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Jugador A')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Jugador B')).toBeInTheDocument();
    expect(within(tarjeta).getAllByRole('listitem')).toHaveLength(3);
    expect(within(tarjeta).getByText('A gana en 2 de 3 métricas')).toBeInTheDocument();
    expect(within(tarjeta).getByText(/más barato/)).toBeInTheDocument();
  });

  it('las barras de la tarjeta no se anuncian a los lectores de pantalla', () => {
    simularPantalla('reducido');
    const { container } = renderizar();
    const barras = container.querySelectorAll('.ejemplo__barra');
    expect(barras.length).toBeGreaterThanOrEqual(6);
    barras.forEach((b) => expect(b).toHaveAttribute('aria-hidden', 'true'));
  });

  it('ya no hay tarjetas flotantes con puntos sobre la línea', () => {
    simularPantalla('reducido');
    const { container } = renderizar();
    expect(container.querySelector('.hero__dato')).toBeNull();
    expect(container.querySelector('.hero__punto')).toBeNull();
  });

  it('las ligas van en una lista que se puede recorrer con el teclado', () => {
    simularPantalla('reducido');
    renderizar();
    expect(screen.getByRole('list', { name: 'Ligas disponibles' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('el indicador de scroll lleva a "Cómo funciona"', () => {
    simularPantalla('reducido');
    const destino = document.createElement('section');
    destino.id = 'como-funciona';
    destino.scrollIntoView = vi.fn();
    document.body.appendChild(destino);

    renderizar();
    const indicador = screen.getByRole('link', { name: 'Ver cómo funciona' });
    expect(indicador).toHaveAttribute('href', '#como-funciona');
    indicador.click();
    expect(destino.scrollIntoView).toHaveBeenCalled();
    destino.remove();
  });

  it('con sesión el botón principal sigue siendo uno solo', () => {
    simularPantalla('reducido');
    renderizar(true);
    const cta = document.querySelector('.hero__cta') as HTMLElement;
    expect(within(cta).getAllByRole('link')).toHaveLength(1);
  });
});
