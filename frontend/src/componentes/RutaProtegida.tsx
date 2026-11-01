import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSesion } from '../contexto/SesionContext';

/** Las rutas 🔒 del contrato: sin sesión, a /ingresar recordando a dónde quería ir. */
export default function RutaProtegida() {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();

  if (cargando) return <p className="wrap app muted">Cargando…</p>;
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion }} />;
  return <Outlet />;
}
