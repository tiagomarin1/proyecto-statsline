import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Ingresar from './Ingresar';

const { ingresarMock, avisarMock } = vi.hoisted(() => ({
  ingresarMock: vi.fn(),
  avisarMock: vi.fn(),
}));
vi.mock('../contexto/SesionContext', () => ({ useSesion: () => ({ ingresar: ingresarMock }) }));
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));

function ingresarCon(nombre: string) {
  ingresarMock.mockResolvedValue({ id: 1, nombre, email: 'a@b.com', rol: 'ojeador', club: 'x' });
  render(
    <MemoryRouter>
      <Ingresar />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'tiago@club.com' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('UI-012: aviso al ingresar con el primer nombre con mayúscula', () => {
  afterEach(() => {
    ingresarMock.mockReset();
    avisarMock.mockReset();
  });

  it('"tiago marin" saluda "Hola, Tiago."', async () => {
    ingresarCon('tiago marin');
    await waitFor(() => expect(avisarMock).toHaveBeenCalledWith('Hola, Tiago.'));
    // lo que se manda a la API no cambia
    expect(ingresarMock).toHaveBeenCalledWith({
      email: 'tiago@club.com',
      contrasena: 'secreta123',
    });
  });

  it('un nombre ya bien escrito saluda igual que antes', async () => {
    ingresarCon('Javier Ledesma');
    await waitFor(() => expect(avisarMock).toHaveBeenCalledWith('Hola, Javier.'));
  });
});
