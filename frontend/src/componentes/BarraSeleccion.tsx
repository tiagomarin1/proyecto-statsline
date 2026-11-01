import type { JugadorResumen } from '../tipos/api';

interface Props {
  seleccion: JugadorResumen[];
  onQuitar: (id: number) => void;
  onLimpiar: () => void;
  onComparar: () => void;
}

/** Barra fija al pie de Buscar: muestra los seleccionados y lanza la comparación (CMP-001). */
export default function BarraSeleccion({ seleccion, onQuitar, onLimpiar, onComparar }: Props) {
  const n = seleccion.length;
  return (
    <div className="selbar" aria-label="Jugadores seleccionados para comparar">
      <div className="selbar__names">
        {n === 0 ? (
          <span className="muted">Seleccioná 2 o 3 jugadores para comparar</span>
        ) : (
          seleccion.map((j) => (
            <span key={j.id} className="chip chip--accent">
              {j.nombre}
              <button
                type="button"
                aria-label={`Quitar a ${j.nombre} de la comparación`}
                onClick={() => onQuitar(j.id)}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      {n > 0 && (
        <button className="btn btn--ghost btn--sm" type="button" onClick={onLimpiar}>
          Quitar todos
        </button>
      )}
      <button className="btn btn--primary" type="button" disabled={n < 2} onClick={onComparar}>
        Comparar{n ? ` ${n}` : ''}
      </button>
    </div>
  );
}
