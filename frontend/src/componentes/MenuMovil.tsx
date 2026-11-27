import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { LINK_WHATSAPP } from '../utilidades/contacto';
import { usePantallaChica } from '../utilidades/pantalla';

interface Props {
  usuario: { nombre: string } | null;
  onVerTour: () => void;
  onSalir: () => void;
}

/** UI-008: botón de tres rayas y panel con todas las opciones de navegación. Solo se ve en
 *  pantallas de menos de 768 px (el CSS lo oculta en escritorio). */
export default function MenuMovil({ usuario, onVerTour, onSalir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const chica = usePantallaChica();

  // al elegir una pantalla el menú se cierra
  useEffect(() => setAbierto(false), [pathname]);
  // si la pantalla pasa a escritorio, el menú no queda abierto de fondo
  useEffect(() => {
    if (!chica) setAbierto(false);
  }, [chica]);

  // con el menú abierto la página de atrás no se mueve. Se bloquea <html> y no <body>: con <body>
  // la barra deja de quedarse pegada arriba (position: sticky)
  useEffect(() => {
    if (!abierto) return;
    const previo = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previo;
    };
  }, [abierto]);

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape' && abierto) {
      setAbierto(false);
      boton.current?.focus();
    }
  }

  const cerrar = () => setAbierto(false);

  return (
    <div className="mnav" onKeyDown={alTeclear}>
      <button
        ref={boton}
        type="button"
        className="mnav__btn"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={abierto}
        aria-controls="menu-movil"
        onClick={() => setAbierto(!abierto)}
      >
        <span className="mnav__rayas" aria-hidden="true" />
      </button>

      {abierto && (
        <>
          <div className="mnav__fondo" data-testid="fondo-menu" onClick={cerrar} />
          <nav id="menu-movil" className="mnav__panel" aria-label="Menú">
            {usuario && <p className="mnav__quien">{usuario.nombre}</p>}
            <ul>
              {usuario ? (
                <>
                  <li>
                    <NavLink to="/buscar">Buscar</NavLink>
                  </li>
                  <li>
                    <NavLink to="/seguimiento">Seguimiento</NavLink>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        cerrar();
                        onVerTour();
                      }}
                    >
                      Ver tour
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/">Inicio</Link>
                  </li>
                  <li>
                    <Link to="/ingresar">Ingresar</Link>
                  </li>
                  <li>
                    <Link className="mnav__cta" to="/registro">
                      Registrarse
                    </Link>
                  </li>
                </>
              )}
            </ul>
            <ul className="mnav__sec">
              <li>
                <Link to="/terminos">Términos</Link>
              </li>
              <li>
                <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer">
                  Escribinos por WhatsApp
                </a>
              </li>
              {usuario && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      cerrar();
                      onSalir();
                    }}
                  >
                    Salir
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
