import type { FilaComparacion } from '../tipos/api';
import { puntosRadar } from '../utilidades/comparacion';

interface Props {
  filas: Pick<FilaComparacion, 'metrica' | 'etiqueta' | 'valores'>[];
  jugadores: { id: number; nombre: string; letra: string; oculto: boolean }[];
}

const COLORES = ['var(--accent)', 'var(--good)', 'var(--bad)'];
const R = 90;
const C = 120;

/** Vista alternativa de CMP-004: perfil de porcentajes y rating en una escala 0-100 (RN-037). */
export default function RadarComparacion({ filas, jugadores }: Props) {
  const ejes = puntosRadar(filas);
  if (ejes.length < 3) {
    return <p className="muted radar__vacio">El radar necesita al menos 3 métricas.</p>;
  }
  const punto = (eje: number, valor: number) => {
    const ang = (Math.PI * 2 * eje) / ejes.length - Math.PI / 2;
    const r = (valor / 100) * R;
    return [C + r * Math.cos(ang), C + r * Math.sin(ang)] as const;
  };
  const descripcion = jugadores
    .filter((j) => !j.oculto)
    .map((j) => {
      const i = jugadores.indexOf(j);
      return `${j.letra}: ${ejes.map((e) => `${e.etiqueta} ${e.valores[i] ?? 'dato no disponible'}`).join(', ')}`;
    })
    .join('. ');
  return (
    <div className="radar">
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label={`Radar de perfil. ${descripcion}`}
        className="radar__svg"
      >
        {[25, 50, 75, 100].map((n) => (
          <polygon
            key={n}
            className="radar__anillo"
            points={ejes.map((_, e) => punto(e, n).join(',')).join(' ')}
          />
        ))}
        {ejes.map((e, k) => {
          const [x, y] = punto(k, 100);
          const [tx, ty] = punto(k, 118);
          return (
            <g key={e.etiqueta}>
              <line className="radar__eje" x1={C} y1={C} x2={x} y2={y} />
              <text className="radar__txt" x={tx} y={ty} textAnchor="middle">
                {e.etiqueta}
              </text>
            </g>
          );
        })}
        {jugadores.map((j, i) => {
          if (j.oculto) return null;
          const pts = ejes.map((e, k) => (e.valores[i] === null ? null : punto(k, e.valores[i]!)));
          const completos = pts.filter((p): p is readonly [number, number] => p !== null);
          return (
            <g key={j.id} style={{ color: COLORES[i] }}>
              {completos.length >= 3 && (
                <polygon
                  className="radar__area"
                  points={completos.map((p) => p.join(',')).join(' ')}
                />
              )}
              {completos.map((p, k) => (
                <circle key={k} className="radar__punto" cx={p[0]} cy={p[1]} r={3.5} />
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="legend radar__ley">
        {jugadores.map((j, i) => (
          <li key={j.id} className={j.oculto ? 'is-oculto' : ''}>
            <i style={{ background: COLORES[i] }} />
            {j.letra} · {j.nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}
