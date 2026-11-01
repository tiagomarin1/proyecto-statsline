import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';

export default function LayoutApp() {
  const { usuario, salir } = useSesion();
  const avisar = useAvisar();
  const navegar = useNavigate();

  // Sombra + blur en la barra apenas se scrollea.
  const [scrolleado, setScrolleado] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolleado(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function cerrarSesion() {
    await salir();
    avisar('Cerraste la sesión.');
    navegar('/');
  }

  return (
    <>
      <header className={`topbar${scrolleado ? ' is-scrolled' : ''}`}>
        <div className="topbar__in wrap">
          <Link className="logo" to="/">
            Stats<i>Line</i>
          </Link>
          {usuario ? (
            <nav className="nav nav--app" aria-label="Principal">
              <NavLink to="/buscar">Buscar</NavLink>
              <NavLink to="/seguimiento">Seguimiento</NavLink>
              <span className="nav__sep" />
              <span className="muted">{usuario.nombre.split(' ')[0]}</span>
              <button className="btn btn--ghost btn--sm" type="button" onClick={cerrarSesion}>
                Salir
              </button>
            </nav>
          ) : (
            <nav className="nav nav--site" aria-label="Principal">
              <Link to="/ingresar">Ingresar</Link>
              <Link className="nav__cta btn btn--sky btn--sm" to="/registro">
                Registrarse
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="foot">
        <div className="foot__in wrap">
          <Link className="logo logo--sm" to="/">
            Stats<i>Line</i>
          </Link>
          <span>Equipo 04 · UADE</span>
          <span className="foot__note">Datos de ligas del fútbol argentino</span>
        </div>
      </footer>
    </>
  );
}
