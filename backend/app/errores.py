"""Formato único de errores de la API: {"detalle", "codigo"} (CONTRATO_DE_API.md)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError
from starlette.exceptions import HTTPException as StarletteHTTPException

DETALLE_VALIDACION = "Hay datos inválidos en el pedido."
CODIGOS_HTTP = {404: "no_encontrado", 405: "metodo_no_permitido"}
DETALLES_HTTP = {
    404: "No existe el recurso pedido.",
    405: "El método no está permitido en esta ruta.",
}


class ErrorApi(Exception):
    """Error de negocio con un mensaje para el usuario y un código para la máquina."""

    def __init__(
        self,
        status_code: int,
        codigo: str,
        detalle: str,
        errores: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(detalle)
        self.status_code = status_code
        self.codigo = codigo
        self.detalle = detalle
        self.errores = errores


class ErrorValidacion(ErrorApi):
    """422 con un mensaje por campo: {"detalle", "codigo": "validacion", "errores"}."""

    def __init__(self, errores: list[dict[str, str]]) -> None:
        super().__init__(422, "validacion", DETALLE_VALIDACION, errores)


def _campo(ubicacion: tuple) -> str:
    # Se saca el origen ("body", "query", ...) para devolver solo el nombre del campo
    return ".".join(str(parte) for parte in ubicacion[1:]) or str(ubicacion[0])


async def _manejar_error_api(_: Request, error: ErrorApi) -> JSONResponse:
    contenido: dict = {"detalle": error.detalle, "codigo": error.codigo}
    if error.errores is not None:
        contenido["errores"] = error.errores
    return JSONResponse(status_code=error.status_code, content=contenido)


async def _manejar_validacion(_: Request, error: RequestValidationError) -> JSONResponse:
    errores = [{"campo": _campo(tuple(e["loc"])), "mensaje": e["msg"]} for e in error.errors()]
    return JSONResponse(
        status_code=422,
        content={
            "detalle": DETALLE_VALIDACION,
            "codigo": "validacion",
            "errores": errores,
        },
    )


async def _manejar_dato_rechazado(_: Request, __: DataError) -> JSONResponse:
    """La base rechazó un dato que pasó la validación (un id fuera de rango de BIGINT, un texto
    más largo que la columna): es un pedido inválido, no un error del servidor."""
    return JSONResponse(
        status_code=422, content={"detalle": DETALLE_VALIDACION, "codigo": "validacion"}
    )


async def _manejar_http(_: Request, error: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={
            "detalle": DETALLES_HTTP.get(error.status_code, str(error.detail)),
            "codigo": CODIGOS_HTTP.get(error.status_code, "error_http"),
        },
        headers=getattr(error, "headers", None),
    )


def registrar_manejadores_de_errores(app: FastAPI) -> None:
    app.add_exception_handler(ErrorApi, _manejar_error_api)
    app.add_exception_handler(RequestValidationError, _manejar_validacion)
    app.add_exception_handler(StarletteHTTPException, _manejar_http)
    app.add_exception_handler(DataError, _manejar_dato_rechazado)
