import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { LINK_WHATSAPP } from '../utilidades/contacto';
import { nombrePropio } from '../utilidades/formato';
import { usePantallaChica } from '../utilidades/pantalla';

interface Props {
  usuario: { nombre: string; club?: string | null } | null;
  onAyuda: () => void;
  onSalir: () => void;
}

/** Botón de tres rayas y panel de navegación: un solo componente para el celular y el escritorio.
 *  - Celular (UI-008): el panel tiene todas las opciones y bloquea el scroll de atrás.
 *  - Escritorio (UI-012): lo principal ya está en la barra; el panel, anclado a la derecha, tiene
 *    el nombre y el club, Ayuda, Términos, WhatsApp y Salir, y no bloquea el scroll. */
export default function MenuNavegacion({ usuario, onAyuda, onSalir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const chica = usePantallaChica();

  // al elegir una pantalla el menú se cierra
  useEffect(() => setAbierto(false), [pathname]);
  // si cambia entre celular y escritorio, el menú no queda abierto de fondo
  useEffect(() => setAbierto(false), [chica]);

  // en el celular la página de atrás no se mueve. Se bloquea <html> y no <body>: con <body> la
  // barra deja de quedarse pegada arriba (position: sticky). En escritorio no se bloquea
  useEffect(() => {
    if (!abierto || !chica) return;
    const previo = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previo;
    };
  }, [abierto, chica]);

  // tocar afuera cierra (en el celular además está el fondo oscuro)
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: Event) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', alTocar);
    return () => document.removeEventListener('pointerdown', alTocar);
  }, [abierto]);

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape' && abierto) {
      setAbierto(false);
      boton.current?.focus();
    }
  }

  const cerrar = () => setAbierto(false);
  const opcion = (texto: string, accion: () => void) => (
    <li>
      <button
        type="button"
        onClick={() => {
          cerrar();
          accion();
        }}
      >
        {texto}
      </button>
    </li>
  );

  const principales = chica ? (
    usuario ? (
      <ul>
        <li>
          <NavLink to="/buscar">Buscar jugadores</NavLink>
        </li>
        <li>
          <NavLink to="/seguimiento">Seguimiento</NavLink>
        </li>
      </ul>
    ) : (
      <ul>
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
      </ul>
    )
  ) : null;

  return (
    <div className="mnav" ref={contenedor} onKeyDown={alTeclear}>
      <button
        ref={boton}
        type="button"
        className="mnav__btn"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={abierto}
        aria-controls="menu-navegacion"
        onClick={() => setAbierto(!abierto)}
      >
        <span className="mnav__rayas" aria-hidden="true" />
      </button>

      {abierto && (
        <>
          {chica && <div className="mnav__fondo" data-testid="fondo-menu" onClick={cerrar} />}
          <nav id="menu-navegacion" className="mnav__panel" aria-label="Menú">
            {usuario && (
              <p className="mnav__quien">
                {/* el nombre con mayúscula inicial; el club se muestra como lo escribió (UI-012) */}
                <b>{nombrePropio(usuario.nombre)}</b>
                {!chica && usuario.club && <span>{usuario.club}</span>}
              </p>
            )}
            {principales}
            <ul className="mnav__sec">
              {!chica && !usuario && (
                <li>
                  <Link to="/">Inicio</Link>
                </li>
              )}
              {usuario && opcion('Ayuda', onAyuda)}
              <li>
                <Link to="/terminos">Términos</Link>
              </li>
              <li>
                <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer">
                  Escribinos por WhatsApp
                </a>
              </li>
              {usuario && opcion('Salir', onSalir)}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
