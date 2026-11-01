import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom';

import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';
import { ErrorApi } from '../servicios/api';

export default function Ingresar() {
  const { ingresar } = useSesion();
  const avisar = useAvisar();
  const navegar = useNavigate();
  const desde = (useLocation().state as { desde?: Location } | null)?.desde?.pathname ?? '/buscar';
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setEnviando(true);
    setError('');
    try {
      const u = await ingresar({
        email: String(datos.get('email')),
        contrasena: String(datos.get('contrasena')),
      });
      avisar(`Hola, ${u.nombre.split(' ')[0]}.`);
      navegar(desde, { replace: true });
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos conectar con el servidor.');
      setEnviando(false);
    }
  }

  return (
    <div className="wrap authpage">
      <section className="card auth reveal">
        <h1>Ingresar</h1>
        <p className="auth__sub">Entrá para ver tus búsquedas y tu lista de seguimiento.</p>
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
          <div className="field">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              className="input"
              id="contrasena"
              name="contrasena"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn--primary btn--block" type="submit" aria-busy={enviando} disabled={enviando}>
            {enviando && <span className="spin" aria-hidden="true" />}
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="auth__alt">
          ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
        </p>
      </section>
    </div>
  );
}
