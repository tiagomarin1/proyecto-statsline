import { useEffect, useRef, useState } from 'react';

import { buscarJugadores } from '../servicios/jugadores';
import type { JugadorResumen } from '../tipos/api';
import { POSICIONES } from '../utilidades/formato';

interface Props {
  /** jugadores que ya están en la comparación: no se ofrecen */
  excluirIds: number[];
  onElegir: (jugador: JugadorResumen) => void;
  onCerrar: () => void;
}

const MIN_LETRAS = 2;
const ESPERA_MS = 250;
const TAMANO = 6;

/** Buscador por nombre (BUS-010) para cambiar o sumar un jugador sin salir de la comparación. */
export default function BuscadorJugador({ excluirIds, onElegir, onCerrar }: Props) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<JugadorResumen[] | null>(null);
  const [error, setError] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const claveExcluidos = excluirIds.join(',');

  useEffect(() => campo.current?.focus(), []);

  useEffect(() => {
    const nombre = texto.trim();
    if (nombre.length < MIN_LETRAS) {
      setResultados(null);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      setError(false);
      buscarJugadores(new URLSearchParams({ nombre, tamano: String(TAMANO) }))
        .then(
          (r) => vigente && setResultados(r.resultados.filter((j) => !excluirIds.includes(j.id))),
        )
        .catch(() => vigente && (setError(true), setResultados(null)));
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, claveExcluidos]);

  return (
    <div className="bj" role="group" aria-label="Elegir jugador">
      <div className="bj__fila">
        <input
          ref={campo}
          type="search"
          aria-label="Buscar jugador por nombre"
          placeholder="Nombre del jugador"
          value={texto}
          maxLength={60}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
        />
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
      {error && <p className="bj__msg">No pudimos buscar ahora. Probá de nuevo.</p>}
      {resultados && resultados.length === 0 && (
        <p className="bj__msg">No encontramos jugadores con ese nombre</p>
      )}
      {resultados && resultados.length > 0 && (
        <ul className="bj__lista">
          {resultados.map((j) => (
            <li key={j.id}>
              <button type="button" onClick={() => onElegir(j)}>
                <b>{j.nombre_completo}</b>
                <span>
                  {j.posicion ? POSICIONES[j.posicion] : 'Posición no disponible'} · {j.equipo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
