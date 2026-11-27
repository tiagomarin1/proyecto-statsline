import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LayoutApp from './LayoutApp';

const TIAGO = { nombre: 'Tiago Marin', club: 'Club Atlético Demo' };
let usuario: { nombre: string; club: string } | null = TIAGO;
const { salirMock, avisarMock } = vi.hoisted(() => ({
  salirMock: vi.fn(),
  avisarMock: vi.fn(),
}));
vi.mock('../contexto/SesionContext', () => ({
  useSesion: () => ({ usuario, salir: salirMock }),
}));
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));

/** Simula el ancho de la pantalla: true = celular (menos de 768 px). Sin esto jsdom no tiene
 *  matchMedia y la app se comporta como escritorio. */
function simularPantalla(chica: boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('max-width: 767px') ? chica : false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  // @ts-expect-error: jsdom no trae matchMedia; se vuelve a ese estado
  delete window.matchMedia;
});

const ver = () =>
  render(
    <MemoryRouter initialEntries={['/buscar']}>
      <Routes>
        <Route element={<LayoutApp />}>
          <Route path="/buscar" element={<p>pantalla buscar</p>} />
          <Route path="/seguimiento" element={<p>pantalla seguimiento</p>} />
          <Route path="/" element={<p>pantalla inicio</p>} />
          <Route path="/ingresar" element={<p>pantalla ingresar</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('UI-007: tour para el usuario nuevo', () => {
  beforeEach(() => {
    localStorage.clear();
    usuario = TIAGO;
  });

  it('la primera vez con sesión se muestra solo', () => {
    ver();
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
  });

  it('al cerrarlo no vuelve a salir solo, pero "Ayuda" lo reabre (UI-012)', () => {
    const { unmount } = ver();
    fireEvent.click(screen.getByRole('button', { name: 'Saltar guía' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    ver();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
  });

  it('sin sesión no se muestra', () => {
    usuario = null;
    ver();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(screen.queryByRole('button', { name: 'Ayuda' })).toBeNull();
  });
});

describe('UI-008: menú hamburguesa en el celular', () => {
  beforeEach(() => {
    simularPantalla(true);
    localStorage.setItem('statsline_tour_visto', '1');
    usuario = TIAGO;
    salirMock.mockReset().mockResolvedValue(undefined);
    avisarMock.mockReset();
    document.documentElement.style.overflow = '';
  });
  const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

  it('hay un botón de menú cerrado y todavía no hay panel', () => {
    ver();
    const boton = screen.getByRole('button', { name: 'Abrir menú' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
  });

  it('con sesión abre un panel con todas las opciones y el nombre', () => {
    ver();
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    expect(within(menu).getByText('Tiago Marin')).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Buscar jugadores' })).toHaveAttribute(
      'href',
      '/buscar',
    );
    expect(within(menu).getByRole('link', { name: 'Seguimiento' })).toHaveAttribute(
      'href',
      '/seguimiento',
    );
    expect(within(menu).getByRole('button', { name: 'Ayuda' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Términos' })).toHaveAttribute(
      'href',
      '/terminos',
    );
    expect(within(menu).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    );
    expect(within(menu).getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    // el botón pasa a "Cerrar menú"
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('marca la pantalla actual', () => {
    ver();
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    expect(within(menu).getByRole('link', { name: 'Buscar jugadores' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(menu).getByRole('link', { name: 'Seguimiento' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('sin sesión ofrece Inicio, Ingresar, Registrarse y Términos, y no Seguimiento ni Salir', () => {
    usuario = null;
    ver();
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(menu).getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar',
    );
    expect(within(menu).getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/registro',
    );
    expect(within(menu).getByRole('link', { name: 'Términos' })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Seguimiento' })).toBeNull();
    expect(within(menu).queryByRole('button', { name: 'Salir' })).toBeNull();
    expect(within(menu).queryByRole('button', { name: 'Ayuda' })).toBeNull();
  });

  it('elegir una opción navega y cierra el menú', () => {
    ver();
    abrir();
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Menú' })).getByRole('link', {
        name: 'Seguimiento',
      }),
    );
    expect(screen.getByText('pantalla seguimiento')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
  });

  it('se cierra con Escape (y el foco vuelve al botón), con el fondo y con "Cerrar menú"', () => {
    ver();
    abrir();
    fireEvent.keyDown(screen.getByRole('navigation', { name: 'Menú' }), { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();

    abrir();
    fireEvent.click(screen.getByTestId('fondo-menu'));
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();

    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
  });

  it('"Ayuda" cierra el menú y abre la guía', () => {
    ver();
    abrir();
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Menú' })).getByRole('button', {
        name: 'Ayuda',
      }),
    );
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
  });

  it('"Salir" cierra la sesión, avisa y vuelve a la home', async () => {
    ver();
    abrir();
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Menú' })).getByRole('button', {
        name: 'Salir',
      }),
    );
    expect(salirMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('pantalla inicio')).toBeInTheDocument();
    expect(avisarMock).toHaveBeenCalledWith('Cerraste la sesión.');
  });

  it('"Ayuda" va separada de las opciones principales, junto a las secundarias', () => {
    ver();
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    const listas = within(menu).getAllByRole('list');
    expect(within(listas[0]).queryByRole('button', { name: 'Ayuda' })).toBeNull();
    expect(within(listas[1]).getByRole('button', { name: 'Ayuda' })).toBeInTheDocument();
  });

  it('con el menú abierto la página de atrás no scrollea, y se libera al cerrar', () => {
    ver();
    abrir();
    // en <html> y no en <body>: con <body> la barra deja de quedarse pegada arriba (sticky)
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('UI-012: barra de escritorio flotante con menú', () => {
  beforeEach(() => {
    simularPantalla(false);
    localStorage.setItem('statsline_tour_visto', '1');
    usuario = TIAGO;
    salirMock.mockReset().mockResolvedValue(undefined);
    avisarMock.mockReset();
    document.documentElement.style.overflow = '';
  });
  const principal = () => screen.getByRole('navigation', { name: 'Principal' });
  const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

  it('con sesión muestra "Buscar jugadores" y "Seguimiento" a la vista, con la actual marcada', () => {
    ver();
    const buscar = within(principal()).getByRole('link', { name: 'Buscar jugadores' });
    expect(buscar).toHaveAttribute('href', '/buscar');
    expect(buscar).toHaveAttribute('aria-current', 'page');
    expect(within(principal()).getByRole('link', { name: 'Seguimiento' })).not.toHaveAttribute(
      'aria-current',
    );
    // lo secundario va en el menú, no en la barra
    expect(within(principal()).queryByRole('button', { name: 'Salir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver tour' })).toBeNull();
    expect(screen.queryByText('Tiago Marin')).toBeNull();
  });

  it('el menú de escritorio tiene nombre y club, Ayuda, Términos, WhatsApp y Salir', () => {
    ver();
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    expect(within(menu).getByText('Tiago Marin')).toBeInTheDocument();
    expect(within(menu).getByText('Club Atlético Demo')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Ayuda' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Términos' })).toHaveAttribute(
      'href',
      '/terminos',
    );
    expect(within(menu).getByRole('link', { name: /WhatsApp/ })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    // lo principal ya está en la barra: no se repite
    expect(within(menu).queryByRole('link', { name: 'Buscar jugadores' })).toBeNull();
    expect(within(menu).queryByRole('link', { name: 'Seguimiento' })).toBeNull();
  });

  it('sin sesión muestra Ingresar y Registrarse, y el menú tiene Inicio, Términos y WhatsApp', () => {
    usuario = null;
    ver();
    expect(within(principal()).getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar',
    );
    expect(within(principal()).getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/registro',
    );
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menú' });
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(menu).getByRole('link', { name: 'Términos' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: /WhatsApp/ })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Ingresar' })).toBeNull();
    expect(within(menu).queryByRole('button', { name: 'Salir' })).toBeNull();
  });

  it('no bloquea el scroll de la página', () => {
    ver();
    abrir();
    expect(document.documentElement.style.overflow).toBe('');
    expect(screen.queryByTestId('fondo-menu')).toBeNull();
  });

  it('se cierra con Escape (el foco vuelve al botón), tocando afuera y al navegar', () => {
    ver();
    abrir();
    const boton = screen.getByRole('button', { name: 'Cerrar menú' });
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('navigation', { name: 'Menú' }), { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();

    abrir();
    fireEvent.pointerDown(screen.getByText('pantalla buscar'));
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();

    abrir();
    fireEvent.click(within(principal()).getByRole('link', { name: 'Seguimiento' }));
    expect(screen.getByText('pantalla seguimiento')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menú' })).toBeNull();
  });

  it('"Ayuda" abre la guía y "Salir" cierra la sesión', async () => {
    ver();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Saltar guía' }));

    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(salirMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('pantalla inicio')).toBeInTheDocument();
  });

  it('al scrollear la barra se compacta', () => {
    const { container } = ver();
    const barra = container.querySelector('.topbar') as HTMLElement;
    expect(barra).not.toHaveClass('is-scrolled');
    Object.defineProperty(window, 'scrollY', { value: 40, configurable: true });
    fireEvent.scroll(window);
    expect(barra).toHaveClass('is-scrolled');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
});
