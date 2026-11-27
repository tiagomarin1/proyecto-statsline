/** UI-005: marcador de carga con la forma del contenido, en lugar del texto "Cargando…". */
export default function Esqueleto({ tipo }: { tipo: 'lista' | 'ficha' | 'comparacion' }) {
  return (
    <div className="esq wrap app" role="status" aria-label="Cargando" aria-busy="true">
      {tipo === 'lista' && (
        <div className="esq__grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="esq__tarjeta esq__b" />
          ))}
        </div>
      )}
      {tipo === 'ficha' && (
        <>
          <div className="esq__hero esq__b" />
          <div className="esq__grid">
            <div className="esq__tarjeta esq__b" />
            <div className="esq__tarjeta esq__b" />
          </div>
        </>
      )}
      {tipo === 'comparacion' && (
        <>
          <div className="esq__grid">
            <div className="esq__cab esq__b" />
            <div className="esq__cab esq__b" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="esq__fila esq__b" />
          ))}
        </>
      )}
    </div>
  );
}
