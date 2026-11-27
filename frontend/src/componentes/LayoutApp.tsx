import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';
import { LINK_WHATSAPP } from '../utilidades/contacto';
import { marcarTourVisto, tourVisto } from '../utilidades/persistencia';
import { Logo } from './Logo';
import MenuMovil from './MenuMovil';
import Tour from './Tour';

export default function LayoutApp() {
  const { usuario, salir } = useSesion();
  const avisar = useAvisar();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  // UI-007: el tour sale solo la primera vez con sesión; "Ver tour" lo reabre
  const [tourAbierto, setTourAbierto] = useState(() => tourVisto() === false);
  const cerrarTour = () => {
    marcarTourVisto();
    setTourAbierto(false);
  };

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
            <Logo />
          </Link>
          {usuario ? (
            <nav className="nav nav--app" aria-label="Principal">
              <NavLink to="/buscar">Buscar</NavLink>
              <NavLink to="/seguimiento">Seguimiento</NavLink>
              <button className="nav__tour" type="button" onClick={() => setTourAbierto(true)}>
                Ver tour
              </button>
              <span className="nav__sep" />
              <span className="muted">{usuario.nombre.split(' ')[0]}</span>
              <button className="btn btn--ghost btn--sm" type="button" onClick={cerrarSesion}>
                Salir
              </button>
            </nav>
          ) : (
            <nav className="nav nav--site" aria-label="Principal">
              <Link to="/ingresar">Ingresar</Link>
              <Link className="nav__cta btn btn--oro btn--sm" to="/registro">
                Registrarse
              </Link>
            </nav>
          )}
          <MenuMovil
            usuario={usuario}
            onVerTour={() => setTourAbierto(true)}
            onSalir={cerrarSesion}
          />
        </div>
      </header>

      {usuario && tourAbierto && <Tour onCerrar={cerrarTour} />}

      <main key={pathname} className={`main main--in${pathname === '/' ? ' main--inicio' : ''}`}>
        <Outlet />
      </main>

      <footer className="foot">
        <div className="foot__in wrap">
          <Link className="logo logo--sm" to="/">
            <Logo />
          </Link>
          <span>Equipo 04 · UADE</span>
          <span className="foot__note">Datos de ligas del fútbol argentino</span>
          <nav className="foot__links" aria-label="Enlaces del pie">
            <Link to="/terminos">Términos</Link>
            <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer">
              Escribinos por WhatsApp
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
