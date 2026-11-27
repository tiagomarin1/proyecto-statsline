import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BarraSeleccion from '../componentes/BarraSeleccion';

import Esqueleto from '../componentes/Esqueleto';
import TarjetaJugador from '../componentes/TarjetaJugador';
import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';
import { alternarSeguimiento, listarSeguimiento } from '../servicios/seguimiento';
import type { JugadorResumen } from '../tipos/api';
import { useSeleccion } from '../utilidades/seleccion';

export default function Seguimiento() {
  const { usuario } = useSesion();
  const avisar = useAvisar();
  const navegar = useNavigate();
  const { seleccion, alternar, quitar: quitarDeSeleccion, limpiar } = useSeleccion(avisar);
  const [jugadores, setJugadores] = useState<JugadorResumen[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listarSeguimiento()
      .then(setJugadores)
      .catch(() => setError('No pudimos cargar la lista. Probá de nuevo en un rato.'));
  }, []);

  async function quitar(j: JugadorResumen) {
    try {
      avisar(await alternarSeguimiento(j));
      setJugadores((actuales) => actuales?.filter((x) => x.id !== j.id) ?? null);
      quitarDeSeleccion(j.id);
    } catch {
      avisar('No se pudo actualizar la lista.');
    }
  }

  return (
    <div className="wrap app">
      <div className="app__head">
        <div>
          <h1>Lista de seguimiento</h1>
          <p>Los jugadores que guardó {usuario?.club} para volver a revisarlos.</p>
        </div>
      </div>
      {error && (
        <div className="alert" role="alert">
          <span className="alert__i">!</span>
          <span>{error}</span>
        </div>
      )}
      {!jugadores && !error && <Esqueleto tipo="lista" />}
      {jugadores?.length === 0 && (
        <div className="card empty">
          <h3>Todavía no guardaste ningún jugador</h3>
          <p>Desde los resultados o desde una ficha, tocá la estrella para guardarlo acá.</p>
          <Link className="btn btn--primary" to="/buscar">
            Buscar jugadores
          </Link>
        </div>
      )}
      {!!jugadores?.length && (
        <div className="pgrid">
          {jugadores.map((j) => (
            <TarjetaJugador
              key={j.id}
              jugador={j}
              onAlternarSeguimiento={quitar}
              seleccionado={seleccion.some((x) => x.id === j.id)}
              onAlternarSeleccion={alternar}
            />
          ))}
        </div>
      )}
      {seleccion.length > 0 && (
        <BarraSeleccion
          seleccion={seleccion}
          onQuitar={quitarDeSeleccion}
          onLimpiar={limpiar}
          onComparar={() => navegar(`/comparar?ids=${seleccion.map((s) => s.id).join(',')}`)}
        />
      )}
    </div>
  );
}
