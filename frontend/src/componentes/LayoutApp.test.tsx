import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LayoutApp from './LayoutApp';

let usuario: { nombre: string } | null = { nombre: 'Tiago Marin' };
vi.mock('../contexto/SesionContext', () => ({
  useSesion: () => ({ usuario, salir: vi.fn() }),
}));
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => vi.fn() }));

const ver = () =>
  render(
    <MemoryRouter initialEntries={['/buscar']}>
      <Routes>
        <Route element={<LayoutApp />}>
          <Route path="/buscar" element={<p>pantalla</p>} />
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
