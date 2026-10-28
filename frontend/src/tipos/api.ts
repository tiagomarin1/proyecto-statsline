// Tipos que reflejan los esquemas del backend (CONTRATO_DE_API.md).

/** Formato único de error: {"detalle", "codigo"}. Los 422 suman "errores". */
export interface RespuestaError {
  detalle: string;
  codigo: string;
  errores?: { campo: string; mensaje: string }[];
}

export interface RespuestaSalud {
  estado: 'ok' | 'error';
  base_de_datos: 'ok' | 'error';
}
