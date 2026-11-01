interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

export default function Paginacion({ pagina, totalPaginas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null;
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);

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
        {paginas.map((p) => (
          <button key={p} type="button" aria-current={p === pagina} onClick={() => onCambiar(p)}>
            {p}
          </button>
        ))}
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
