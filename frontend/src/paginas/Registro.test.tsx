import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Registro from './Registro';

const { registrarseMock, avisarMock } = vi.hoisted(() => ({
  registrarseMock: vi.fn(),
  avisarMock: vi.fn(),
}));
vi.mock('../contexto/SesionContext', () => ({
  useSesion: () => ({ registrarse: registrarseMock }),
}));
vi.mock('../contexto/AvisosContext', () => ({ useAvisar: () => avisarMock }));

function registrarseCon(nombre: string, club: string) {
  registrarseMock.mockImplementation(async (datos: { nombre: string; club: string }) => ({
    id: 1,
    email: 'tiago@club.com',
    rol: 'ojeador',
    ...datos,
  }));
  const { container } = render(
    <MemoryRouter>
      <Registro />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Nombre y apellido'), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'tiago@club.com' },
  });
  fireEvent.change(screen.getByLabelText(/Rol/), { target: { value: 'ojeador' } });
  fireEvent.change(screen.getByLabelText('Club'), { target: { value: club } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta123' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.submit(container.querySelector('form') as HTMLFormElement);
}

describe('UI-012: aviso al registrarse con el primer nombre con mayúscula', () => {
  afterEach(() => {
    registrarseMock.mockReset();
    avisarMock.mockReset();
  });

  it('"tiago marin" ve "Cuenta creada. Bienvenido, Tiago." y se guarda tal cual lo escribió', async () => {
    registrarseCon('tiago marin', 'all boys');
    await waitFor(() =>
      expect(avisarMock).toHaveBeenCalledWith('Cuenta creada. Bienvenido, Tiago.'),
    );
    // nada se normaliza en el registro: ni el nombre ni el club
    expect(registrarseMock).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'tiago marin', club: 'all boys' }),
    );
  });

  it('un nombre ya bien escrito no cambia', async () => {
    registrarseCon('Juan McDonald', 'AFA');
    await waitFor(() =>
      expect(avisarMock).toHaveBeenCalledWith('Cuenta creada. Bienvenido, Juan.'),
    );
  });
});
