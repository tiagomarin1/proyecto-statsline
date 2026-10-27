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
});
