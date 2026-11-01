import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import TarjetaJugador from '../componentes/TarjetaJugador';
import { useAvisar } from '../contexto/AvisosContext';
import { useSesion } from '../contexto/SesionContext';
import { alternarSeguimiento, listarSeguimiento } from '../servicios/seguimiento';
import type { JugadorResumen } from '../tipos/api';

export default function Seguimiento() {
  const { usuario } = useSesion();
  const avisar = useAvisar();
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
      {!jugadores && !error && <p className="muted">Cargando…</p>}
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
        <div className="follow">
          {jugadores.map((j) => (
            <TarjetaJugador key={j.id} jugador={j} onAlternarSeguimiento={quitar} />
          ))}
        </div>
      )}
    </div>
  );
}
