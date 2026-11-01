import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';
import { ErrorApi } from '../servicios/api';
import type { RolUsuario } from '../tipos/api';
import { ROLES } from '../utilidades/formato';

type Errores = Record<string, string>;

/** Campo con su error del 422 (errores[].campo) debajo. */
function Campo({
  id,
  label,
  tipo = 'text',
  error,
  pista,
}: {
  id: string;
  label: string;
  tipo?: string;
  error?: string;
  pista?: string;
}) {
  return (
    <div className={`field${error ? ' field--bad' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input className="input" id={id} name={id} type={tipo} required />
      {error ? (
        <p className="field__err">
          <span>!</span>
          {error}
        </p>
      ) : (
        pista && <p className="field__hint">{pista}</p>
      )}
    </div>
  );
}

export default function Registro() {
  const { registrarse } = useSesion();
  const avisar = useAvisar();
  const navegar = useNavigate();
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setEnviando(true);
    setErrores({});
    try {
      const u = await registrarse({
        nombre: String(d.get('nombre')),
        email: String(d.get('email')),
        rol: d.get('rol') as RolUsuario,
        club: String(d.get('club')),
        contrasena: String(d.get('contrasena')),
        acepta_terminos: d.get('acepta_terminos') === 'on',
      });
      avisar(`Cuenta creada. Bienvenido, ${u.nombre.split(' ')[0]}.`);
      navegar('/buscar', { replace: true });
    } catch (err) {
      if (err instanceof ErrorApi) {
        const porCampo = Object.fromEntries((err.errores ?? []).map((x) => [x.campo, x.mensaje]));
        setErrores(
          err.codigo === 'email_registrado'
            ? { email: err.message }
            : { general: err.message, ...porCampo },
        );
      } else {
        setErrores({ general: 'No pudimos conectar con el servidor.' });
      }
      setEnviando(false);
    }
  }

  return (
    <div className="wrap authpage">
      <section className="card auth reveal">
        <h1>Crear cuenta</h1>
        <p className="auth__sub">Empezá a buscar jugadores en minutos.</p>
        {errores.general && (
          <div className="alert" role="alert">
            <span className="alert__i">!</span>
            <span>{errores.general}</span>
          </div>
        )}
        <form className="auth__form" onSubmit={enviar}>
          <Campo id="nombre" label="Nombre y apellido" error={errores.nombre} />
          <Campo id="email" label="Correo electrónico" tipo="email" error={errores.email} />
          <div className={`field${errores.rol ? ' field--bad' : ''}`}>
            <label htmlFor="rol">Rol</label>
            <select className="input" id="rol" name="rol" required defaultValue="">
              <option value="" disabled>
                Seleccioná tu rol
              </option>
              {Object.entries(ROLES).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
            {errores.rol && (
              <p className="field__err">
                <span>!</span>
                {errores.rol}
              </p>
            )}
          </div>
          <Campo id="club" label="Club" error={errores.club} />
          <Campo
            id="contrasena"
            label="Contraseña"
            tipo="password"
            error={errores.contrasena}
            pista="Mínimo 8 caracteres"
          />
          <label className={`check${errores.acepta_terminos ? ' field--bad' : ''}`}>
            <input type="checkbox" name="acepta_terminos" required />
            <span>Acepto los términos y condiciones</span>
          </label>
          <button
            className="btn btn--primary btn--block"
            type="submit"
            aria-busy={enviando}
            disabled={enviando}
          >
            {enviando && <span className="spin" aria-hidden="true" />}
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth__alt">
          ¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link>
        </p>
      </section>
    </div>
  );
}
