import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '../App';

function renderizarEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

describe('INF-001: home', () => {
  it('muestra el hero y los accesos de registro e ingreso', () => {
    renderizarEn('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fichá con datos');
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar');
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute('href', '/registro');
  });

  it('una ruta desconocida vuelve a la home', () => {
    renderizarEn('/no-existe');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fichá con datos');
  });

  it('UI-007: explica cómo funciona en 3 pasos', () => {
    renderizarEn('/');
    const seccion = screen.getByRole('region', { name: 'Cómo funciona' });
    expect(seccion).toHaveTextContent('Buscá');
    expect(seccion).toHaveTextContent('Elegí 2 o 3');
    expect(seccion).toHaveTextContent('Compará');
    expect(seccion.querySelectorAll('li')).toHaveLength(3);
  });
});
