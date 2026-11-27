import { Navigate, Outlet, useLocation } from 'react-router-dom';

import Esqueleto from '../componentes/Esqueleto';
import { useSesion } from '../contexto/SesionContext';

/** Las rutas 🔒 del contrato: sin sesión, a /ingresar recordando a dónde quería ir. */
export default function RutaProtegida() {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();

  if (cargando) return <Esqueleto tipo="lista" />;
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion }} />;
  return <Outlet />;
}
