import type { ClubEnTrayectoria, TramoTrayectoria } from '../tipos/api';

function textoTramo(tramo: TramoTrayectoria): string {
  return tramo.desde === tramo.hasta ? `${tramo.desde}` : `${tramo.desde}–${tramo.hasta}`;
}

/** JUG-003 / RN-032: clubes del jugador, el actual primero. null = nunca se sincronizó (RN-008). */
export default function Trayectoria({ trayectoria }: { trayectoria: ClubEnTrayectoria[] | null }) {
  if (trayectoria === null) {
    return (
      <section className="card trayectoria">
        <h3>Trayectoria</h3>
        <p className="nd">Trayectoria no disponible</p>
      </section>
    );
  }
  const soloActual = trayectoria.length === 1 && trayectoria[0].actual;
  return (
    <section className="card trayectoria">
      <h3>Trayectoria</h3>
      <ul className="trayectoria__lista">
        {trayectoria.map((c) => (
          <li key={c.club} className="trayectoria__item">
            <span className="trayectoria__club">
              {c.club}
              {c.actual && <span className="chip chip--accent">Actual</span>}
            </span>
            <span className="trayectoria__anios num">
              {c.tramos.length > 0 ? c.tramos.map(textoTramo).join(' · ') : 'Sin año'}
            </span>
          </li>
        ))}
      </ul>
      {soloActual && <p className="muted">No hay clubes anteriores registrados</p>}
    </section>
  );
}
