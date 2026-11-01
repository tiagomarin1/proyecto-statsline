/** null ≠ 0 (RN-008): si la liga no publica la métrica se dice, no se inventa un cero. */
export default function Dato({ valor, sufijo = '' }: { valor: number | null; sufijo?: string }) {
  if (valor === null) {
    return (
      <span className="nd" title="La liga de este jugador no publica esta métrica">
        Dato no disponible
      </span>
    );
  }
  return (
    <span className="num">
      {valor}
      {sufijo}
    </span>
  );
}
