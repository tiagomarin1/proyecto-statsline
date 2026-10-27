import { Navigate, Route, Routes } from 'react-router-dom';

import Inicio from './paginas/Inicio';

// Cada feature suma su ruta: /ingresar y /registro (AUT), /buscar (BUS), /ficha/:id (JUG),
// /comparar (CMP) y /seguimiento (SEG).
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
