import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '../App';
import { LINK_WHATSAPP, TELEFONO_VISIBLE } from '../utilidades/contacto';

function renderizarEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

describe('UI-004: términos y condiciones', () => {
  it('/terminos se ve sin sesión y tiene el título', () => {
    renderizarEn('/terminos');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Términos y condiciones');
  });

  it('la sección de contacto tiene el número como link a WhatsApp', () => {
    renderizarEn('/terminos');

    const principal = screen.getByRole('main');
    expect(within(principal).getByRole('link', { name: TELEFONO_VISIBLE })).toHaveAttribute(
      'href',
      LINK_WHATSAPP,
    );
  });

  it('el registro enlaza a los términos en otra pestaña', () => {
    renderizarEn('/registro');

    const enlace = screen.getByRole('link', { name: 'términos y condiciones' });
    expect(enlace).toHaveAttribute('href', '/terminos');
    expect(enlace).toHaveAttribute('target', '_blank');
  });

  it.each(['/', '/terminos'])('el pie de %s tiene los términos y el WhatsApp', (ruta) => {
    renderizarEn(ruta);

    const pie = screen.getByRole('contentinfo');
    expect(within(pie).getByRole('link', { name: 'Términos' })).toHaveAttribute(
      'href',
      '/terminos',
    );
    const whatsapp = within(pie).getByRole('link', { name: 'Escribinos por WhatsApp' });
    expect(whatsapp).toHaveAttribute('href', LINK_WHATSAPP);
    expect(whatsapp).toHaveAttribute('target', '_blank');
  });
});
