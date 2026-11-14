/** Logotipo de StatsLine (hoja de marca del 29/10/2026). Va siempre en minúscula: la l y la i
 *  son bastas dibujadas y solo funcionan en caja baja. El tamaño sale del font-size del padre. */
export function Logo() {
  return (
    <span className="sl" role="img" aria-label="StatsLine">
      <span aria-hidden="true">stats</span>
      <i className="sl-bar sl-l" aria-hidden="true" />
      <i className="sl-bar sl-i" aria-hidden="true">
        <span />
      </i>
      <span aria-hidden="true">ne</span>
    </span>
  );
}
