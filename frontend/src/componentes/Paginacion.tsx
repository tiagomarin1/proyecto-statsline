interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

/** Ventana de páginas a mostrar: primera, última y la actual ±2; el resto se colapsa en "…". */
function ventana(pagina: number, total: number): (number | 'gap')[] {
  const cercanas = new Set<number>([
    1,
    total,
    pagina,
    pagina - 1,
    pagina + 1,
    pagina - 2,
    pagina + 2,
  ]);
  const visibles = [...cercanas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const salida: (number | 'gap')[] = [];
  let previa = 0;
  for (const p of visibles) {
    if (p - previa > 1) salida.push('gap');
    salida.push(p);
    previa = p;
  }
  return salida;
}

export default function Paginacion({ pagina, totalPaginas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className="pager" aria-label="Paginación">
      <div className="pager__btns">
        <button
          type="button"
          disabled={pagina === 1}
          onClick={() => onCambiar(pagina - 1)}
          aria-label="Página anterior"
        >
          ‹
        </button>
        {ventana(pagina, totalPaginas).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="pager__gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button key={p} type="button" aria-current={p === pagina} onClick={() => onCambiar(p)}>
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={pagina === totalPaginas}
          onClick={() => onCambiar(pagina + 1)}
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    </nav>
  );
}
