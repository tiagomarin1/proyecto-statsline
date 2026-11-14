/** null ≠ 0 (RN-008): si la liga no publica la métrica se dice, no se inventa un cero.
 *  `corto` es para las celdas de la tabla: se ve "N/D", y el texto completo queda para lectores
 *  de pantalla y para el tooltip. */
export default function Dato({
  valor,
  sufijo = '',
  corto = false,
}: {
  valor: number | null;
  sufijo?: string;
  corto?: boolean;
}) {
  if (valor === null) {
    return (
      <span className="nd" title="La liga de este jugador no publica esta métrica">
        {corto ? (
          <>
            <span aria-hidden="true">N/D</span>
            <span className="sr-only">Dato no disponible</span>
          </>
        ) : (
          'Dato no disponible'
        )}
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
