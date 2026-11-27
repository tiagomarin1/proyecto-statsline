import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LayoutApp from './LayoutApp';

let usuario: { nombre: string } | null = { nombre: 'Tiago Marin' };
const { salirMock, avisarMock } = vi.hoisted(() => ({
  salirMock: vi.fn(),
  avisarMock: vi.fn(),
}));
vi.mock('../contexto/SesionContext', () => ({
  useSesion: () => ({ usuario, salir: salirMock }),
}));
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));

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
    usuario = { nombre: 'Tiago Marin' };
  });

  it('la primera vez con sesión se muestra solo', () => {
    ver();
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
  });

  it('al cerrarlo no vuelve a salir solo, pero "Ver tour" lo reabre', () => {
    const { unmount } = ver();
    fireEvent.click(screen.getByRole('button', { name: 'Saltar guía' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    ver();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver tour' }));
    expect(screen.getByRole('dialog', { name: 'Guía de bienvenida' })).toBeInTheDocument();
  });

  it('sin sesión no se muestra', () => {
    usuario = null;
    ver();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver tour' })).toBeNull();
  });
});

describe('UI-008: menú hamburguesa en el celular', () => {
  beforeEach(() => {
    localStorage.setItem('statsline_tour_visto', '1');
    usuario = { nombre: 'Tiago Marin' };
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
    expect(within(menu).getByRole('link', { name: 'Buscar' })).toHaveAttribute('href', '/buscar');
    expect(within(menu).getByRole('link', { name: 'Seguimiento' })).toHaveAttribute(
      'href',
      '/seguimiento',
    );
    expect(within(menu).getByRole('button', { name: 'Ver tour' })).toBeInTheDocument();
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
    expect(within(menu).getByRole('link', { name: 'Buscar' })).toHaveAttribute(
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
    expect(within(menu).queryByRole('button', { name: 'Ver tour' })).toBeNull();
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

  it('"Ver tour" cierra el menú y abre la guía', () => {
    ver();
    abrir();
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Menú' })).getByRole('button', {
        name: 'Ver tour',
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
