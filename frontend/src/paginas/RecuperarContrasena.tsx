import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ErrorApi, pedirApi } from '../servicios/api';

/** AUT-003: pedir el link para elegir una contraseña nueva. La respuesta es la misma tenga
 *  cuenta o no el correo (RN-036). */
export default function RecuperarContrasena() {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    setEnviando(true);
    setError('');
    try {
      const r = await pedirApi<{ detalle: string }>('/auth/recuperacion', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMensaje(r.detalle);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="wrap authpage">
      <section className="card auth reveal">
        <h1>Recuperar la contraseña</h1>
        <p className="auth__sub">
          Escribí el correo de tu cuenta y te mandamos un link para elegir una contraseña nueva.
        </p>
        {mensaje && (
          <div className="alert alert--info" role="status">
            <span className="alert__i">✓</span>
            <span>{mensaje}</span>
          </div>
        )}
        {error && (
          <div className="alert" role="alert">
            <span className="alert__i">!</span>
            <span>{error}</span>
          </div>
        )}
        <form className="auth__form" onSubmit={enviar}>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
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
            {enviando ? 'Mandando…' : 'Mandar el link'}
          </button>
        </form>
        <p className="auth__alt">
          ¿Te acordaste? <Link to="/ingresar">Ingresá</Link>
        </p>
      </section>
    </div>
  );
}
