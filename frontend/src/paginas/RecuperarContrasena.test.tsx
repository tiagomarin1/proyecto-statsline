import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '../App';

const MENSAJE_PEDIDO =
  'Si el correo tiene una cuenta, te mandamos un link para elegir una contraseña nueva.';
const TOKEN_INVALIDO = 'El link no es válido o ya venció. Pedí uno nuevo.';

type Respuesta = { status: number; cuerpo?: unknown };

/** fetch falso: responde según la ruta y guarda los pedidos para revisarlos. */
function stubFetch(respuestas: Record<string, Respuesta>) {
  const pedidos: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      pedidos.push({ url, init });
      const r = respuestas[url] ?? { status: 401, cuerpo: { detalle: 'Sin sesión', codigo: 'x' } };
      return new Response(r.cuerpo === undefined ? null : JSON.stringify(r.cuerpo), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  return pedidos;
}

function cuerpoDe(pedidos: { url: string; init?: RequestInit }[], url: string) {
  const pedido = pedidos.find((p) => p.url === url);
  return pedido ? JSON.parse(String(pedido.init?.body)) : undefined;
}

function renderizarEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

const USUARIO = {
  id: 1,
  nombre: 'Javier Ledesma',
  email: 'j@club.com',
  rol: 'director_tecnico',
  club: 'Norte',
};

describe('AUT-003: recuperar la contraseña', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('el ingreso ofrece "¿Olvidaste tu contraseña?"', async () => {
    stubFetch({});
    renderizarEn('/ingresar');

    expect(await screen.findByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
  });

  it('pedir el link manda el correo y muestra el mensaje neutro', async () => {
    const pedidos = stubFetch({
      '/api/v1/auth/recuperacion': { status: 202, cuerpo: { detalle: MENSAJE_PEDIDO } },
    });
    renderizarEn('/recuperar');

    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: 'j@club.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mandar el link' }));

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAJE_PEDIDO);
    expect(cuerpoDe(pedidos, '/api/v1/auth/recuperacion')).toEqual({ email: 'j@club.com' });
  });

  it('si las contraseñas no coinciden avisa y no llama a la API', async () => {
    const pedidos = stubFetch({});
    renderizarEn('/restablecer?token=abc');

    fireEvent.change(await screen.findByLabelText('Contraseña nueva'), {
      target: { value: 'nueva-123456' },
    });
    fireEvent.change(screen.getByLabelText('Repetí la contraseña'), {
      target: { value: 'otra-123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(cuerpoDe(pedidos, '/api/v1/auth/recuperacion/confirmar')).toBeUndefined();
  });

  it('con el link elige la contraseña nueva, entra y avisa', async () => {
    const pedidos = stubFetch({
      '/api/v1/auth/recuperacion/confirmar': { status: 200, cuerpo: USUARIO },
    });
    renderizarEn('/restablecer?token=abc');

    fireEvent.change(await screen.findByLabelText('Contraseña nueva'), {
      target: { value: 'nueva-123456' },
    });
    fireEvent.change(screen.getByLabelText('Repetí la contraseña'), {
      target: { value: 'nueva-123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));

    expect(await screen.findByText('Listo, ya cambiaste tu contraseña.')).toBeInTheDocument();
    await waitFor(() =>
      expect(cuerpoDe(pedidos, '/api/v1/auth/recuperacion/confirmar')).toEqual({
        token: 'abc',
        contrasena: 'nueva-123456',
      }),
    );
  });

  it('un link vencido o usado muestra el error y ofrece pedir otro', async () => {
    stubFetch({
      '/api/v1/auth/recuperacion/confirmar': {
        status: 400,
        cuerpo: { detalle: TOKEN_INVALIDO, codigo: 'token_invalido' },
      },
    });
    renderizarEn('/restablecer?token=vencido');

    fireEvent.change(await screen.findByLabelText('Contraseña nueva'), {
      target: { value: 'nueva-123456' },
    });
    fireEvent.change(screen.getByLabelText('Repetí la contraseña'), {
      target: { value: 'nueva-123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(TOKEN_INVALIDO);
    expect(screen.getByRole('link', { name: 'Pedí un link nuevo' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
  });

  it('sin token en el link no muestra el formulario', async () => {
    stubFetch({});
    renderizarEn('/restablecer');

    expect(await screen.findByRole('alert')).toHaveTextContent(TOKEN_INVALIDO);
    expect(screen.queryByLabelText('Contraseña nueva')).not.toBeInTheDocument();
  });
});
