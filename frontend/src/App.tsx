import { Navigate, Route, Routes } from 'react-router-dom';

import LayoutApp from './componentes/LayoutApp';
import RutaProtegida from './componentes/RutaProtegida';
import { AvisosProvider } from './contexto/AvisosContext';
import { SesionProvider } from './contexto/SesionContext';
import Buscar from './paginas/Buscar';
import Comparar from './paginas/Comparar';
import Ficha from './paginas/Ficha';
import Ingresar from './paginas/Ingresar';
import Inicio from './paginas/Inicio';
import Registro from './paginas/Registro';
import Seguimiento from './paginas/Seguimiento';

export default function App() {
  return (
    <SesionProvider>
      <AvisosProvider>
        <Routes>
          <Route element={<LayoutApp />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/ingresar" element={<Ingresar />} />
            <Route path="/registro" element={<Registro />} />
            <Route element={<RutaProtegida />}>
              <Route path="/buscar" element={<Buscar />} />
              <Route path="/comparar" element={<Comparar />} />
              <Route path="/ficha/:id" element={<Ficha />} />
              <Route path="/seguimiento" element={<Seguimiento />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AvisosProvider>
    </SesionProvider>
  );
}
