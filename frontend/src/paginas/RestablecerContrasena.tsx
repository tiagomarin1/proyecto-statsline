import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';
import { ErrorApi } from '../servicios/api';

const MENSAJE_TOKEN_INVALIDO = 'El link no es válido o ya venció. Pedí uno nuevo.';

/** AUT-003: elegir la contraseña nueva con el link del mail (RN-036). Después queda la sesión
 *  iniciada y va a /buscar. */
export default function RestablecerContrasena() {
  const { restablecerContrasena } = useSesion();
  const avisar = useAvisar();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  // El token se guarda una vez y se saca de la barra de direcciones, para que no quede a la vista
  const [token] = useState(() => params.get('token') ?? '');
  const [error, setError] = useState(token ? '' : MENSAJE_TOKEN_INVALIDO);
  const [tokenInvalido, setTokenInvalido] = useState(!token);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (params.has('token')) navegar('/restablecer', { replace: true });
  }, [params, navegar]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const contrasena = String(datos.get('contrasena'));
    if (contrasena !== String(datos.get('repeticion'))) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await restablecerContrasena({ token, contrasena });
      avisar('Listo, ya cambiaste tu contraseña.');
      navegar('/buscar', { replace: true });
    } catch (err) {
      if (err instanceof ErrorApi && err.codigo === 'token_invalido') setTokenInvalido(true);
      setError(
        err instanceof ErrorApi
          ? (err.errores?.[0]?.mensaje ?? err.message)
          : 'No pudimos conectar con el servidor.',
      );
      setEnviando(false);
    }
  }

  return (
    <div className="wrap authpage">
      <section className="card auth reveal">
        <h1>Elegí una contraseña nueva</h1>
        {error && (
          <div className="alert" role="alert">
            <span className="alert__i">!</span>
            <span>{error}</span>
          </div>
        )}
        {tokenInvalido ? (
          <p className="auth__alt">
            <Link to="/recuperar">Pedí un link nuevo</Link>
          </p>
        ) : (
          <form className="auth__form" onSubmit={enviar}>
            <div className="field">
              <label htmlFor="contrasena">Contraseña nueva</label>
              <input
                className="input"
                id="contrasena"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="field__hint">Mínimo 8 caracteres</p>
            </div>
            <div className="field">
              <label htmlFor="repeticion">Repetí la contraseña</label>
              <input
                className="input"
                id="repeticion"
                name="repeticion"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <button
              className="btn btn--primary btn--block"
              type="submit"
              aria-busy={enviando}
              disabled={enviando}
            >
              {enviando && <span className="spin" aria-hidden="true" />}
              {enviando ? 'Cambiando…' : 'Cambiar la contraseña'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
