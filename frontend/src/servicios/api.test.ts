import { ErrorApi, pedirApi } from './api';

function responder(status: number, cuerpo: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('INF-001: cliente de la API', () => {
  it('manda la cookie de sesión y devuelve el JSON', async () => {
    const fetchFalso = responder(200, { estado: 'ok', base_de_datos: 'ok' });
    vi.stubGlobal('fetch', fetchFalso);

    const salud = await pedirApi('/salud');

    expect(salud).toEqual({ estado: 'ok', base_de_datos: 'ok' });
    expect(fetchFalso).toHaveBeenCalledWith(
      '/api/v1/salud',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('convierte el formato de error del backend en ErrorApi', async () => {
    vi.stubGlobal(
      'fetch',
      responder(401, {
        detalle: 'Necesitás iniciar sesión para entrar a esa pantalla.',
        codigo: 'sin_sesion',
      }),
    );

    const error = await pedirApi('/auth/yo').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status: 401, codigo: 'sin_sesion' });
  });
});
