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

  it('UI-007 y UI-014: explica cómo funciona en 3 pasos, como demo guiada', () => {
    renderizarEn('/');
    const seccion = screen.getByRole('region', { name: 'Cómo funciona' });
    expect(seccion).toHaveTextContent('Buscá');
    expect(seccion).toHaveTextContent('Elegí 2 o 3');
    expect(seccion).toHaveTextContent('Compará');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('UI-014: "Por qué StatsLine" va antes de "Cómo funciona"', () => {
    renderizarEn('/');
    const porQue = screen.getByRole('region', { name: 'Por qué StatsLine' });
    const como = screen.getByRole('region', { name: 'Cómo funciona' });
    expect(porQue.compareDocumentPosition(como) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('UI-003: la sección "Cómo funciona" es el destino del indicador del hero', () => {
    renderizarEn('/');
    expect(screen.getByRole('region', { name: 'Cómo funciona' })).toHaveAttribute(
      'id',
      'como-funciona',
    );
  });
});
