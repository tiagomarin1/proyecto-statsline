import type { RespuestaError } from '../tipos/api';

const PREFIJO_API = '/api/v1';

/** Error de la API con el mensaje para el usuario y el código para la máquina. */
export class ErrorApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly errores: RespuestaError['errores'];

  constructor(status: number, cuerpo: RespuestaError) {
    super(cuerpo.detalle);
    this.status = status;
    this.codigo = cuerpo.codigo;
    this.errores = cuerpo.errores;
  }
}

/** fetch contra la API con la cookie de sesión (credentials: 'include', ADR-0005). */
export async function pedirApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${PREFIJO_API}${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  });
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as RespuestaError | null;
    throw new ErrorApi(
      respuesta.status,
      cuerpo ?? { detalle: 'Error inesperado.', codigo: 'desconocido' },
    );
  }
  if (respuesta.status === 204) {
    return undefined as T;
  }
  return (await respuesta.json()) as T;
}
