"""Formato único de errores de la API: {"detalle", "codigo"} (CONTRATO_DE_API.md)."""

from decimal import Decimal

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

# Mensaje en español por cada tipo de error de Pydantic que puede mandar el frontend. Los {…}
# salen del "ctx" del error. Un tipo que no está acá usa MENSAJE_VALIDACION_GENERICO.
MENSAJE_ENTERO = "Tiene que ser un número entero."
MENSAJE_NUMERO = "Tiene que ser un número."
MENSAJE_BOOLEANO = "Tiene que ser verdadero o falso."
MENSAJE_OPCIONES = "Tiene que ser uno de estos valores: {expected}."
MENSAJE_FORMATO_CUERPO = "El cuerpo del pedido no tiene el formato esperado."
MENSAJES_VALIDACION = {
    "missing": "Falta este dato.",
    "greater_than_equal": "Tiene que ser mayor o igual a {ge}.",
    "greater_than": "Tiene que ser mayor que {gt}.",
    "less_than_equal": "Tiene que ser menor o igual a {le}.",
    "less_than": "Tiene que ser menor que {lt}.",
    "int_parsing": MENSAJE_ENTERO,
    "int_type": MENSAJE_ENTERO,
    "int_from_float": MENSAJE_ENTERO,
    "float_parsing": MENSAJE_NUMERO,
    "float_type": MENSAJE_NUMERO,
    "bool_parsing": MENSAJE_BOOLEANO,
    "bool_type": MENSAJE_BOOLEANO,
    "string_type": "Tiene que ser un texto.",
    "string_too_long": "Puede tener hasta {max_length} caracteres.",
    "list_type": "Tiene que ser una lista.",
    "enum": MENSAJE_OPCIONES,
    "literal_error": MENSAJE_OPCIONES,
    "json_invalid": "El cuerpo del pedido no es un JSON válido.",
    "model_attributes_type": MENSAJE_FORMATO_CUERPO,
    "dict_type": MENSAJE_FORMATO_CUERPO,
}
MENSAJE_VALIDACION_GENERICO = "El valor no es válido."
# Campo de los errores de todo el pedido, según de dónde venga (un JSON roto, un cuerpo que no
# es un objeto, una regla de todo el esquema de la consulta)
CAMPO_CUERPO = "cuerpo"
CAMPOS_DE_ORIGEN = {"body": CAMPO_CUERPO, "query": "consulta"}
# 20,000.5 → 20.000,5
SEPARADORES_UI = str.maketrans(",.", ".,")


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


class ValorInvalido(ValueError):
    """ValueError de un validador propio: su mensaje ya está en español y llega tal cual al
    usuario. Un ValueError común (de una librería, de un int()) usa el mensaje genérico.

    `campo` marca en qué campo se muestra el error de una regla de todo el esquema
    (model_validator), que Pydantic ubica en el esquema y no en un campo."""

    def __init__(self, mensaje: str, campo: str | None = None) -> None:
        super().__init__(mensaje)
        self.campo = campo


class ErrorValidacion(ErrorApi):
    """422 con un mensaje por campo: {"detalle", "codigo": "validacion", "errores"}."""

    def __init__(self, errores: list[dict[str, str]]) -> None:
        super().__init__(422, "validacion", DETALLE_VALIDACION, errores)


def _campo(error: dict) -> str:
    origen, *partes = error["loc"]
    # Un JSON roto trae la posición del carácter en lugar de un campo
    if error["type"] == "json_invalid":
        return CAMPO_CUERPO
    error_propio = (error.get("ctx") or {}).get("error")
    if isinstance(error_propio, ValorInvalido) and error_propio.campo is not None:
        partes = [*partes, error_propio.campo]
    if not partes:
        return CAMPOS_DE_ORIGEN.get(origen, str(origen))
    # Se saca el origen ("body", "query", ...) para devolver solo el nombre del campo
    return ".".join(str(parte) for parte in partes)


async def _manejar_error_api(_: Request, error: ErrorApi) -> JSONResponse:
    contenido: dict = {"detalle": error.detalle, "codigo": error.codigo}
    if error.errores is not None:
        contenido["errores"] = error.errores
    return JSONResponse(status_code=error.status_code, content=contenido)


def _formatear_contexto(clave: str, valor: object) -> str:
    """Números como en la UI (20.000, 1.234,5) y las opciones de `expected` sin comillas
    ("a, b o c")."""
    if isinstance(valor, bool):
        return "verdadero" if valor else "falso"
    if isinstance(valor, int | float | Decimal):
        # normalize saca los ceros de más y "f" evita la notación científica (1e-05)
        texto = f"{Decimal(str(valor)).normalize():,f}"
        return texto.translate(SEPARADORES_UI)
    if clave == "expected":
        return str(valor).replace("'", "").replace(" or ", " o ")
    return str(valor)


def _mensaje(error: dict) -> str:
    """El mensaje en español de un error de Pydantic. Los ValorInvalido de los validadores propios
    ya están en español: se usa su texto sin el prefijo "Value error, "."""
    contexto = error.get("ctx") or {}
    if isinstance(contexto.get("error"), ValorInvalido):
        return str(contexto["error"])
    plantilla = MENSAJES_VALIDACION.get(error["type"], MENSAJE_VALIDACION_GENERICO)
    try:
        return plantilla.format(**{k: _formatear_contexto(k, v) for k, v in contexto.items()})
    except KeyError:
        return MENSAJE_VALIDACION_GENERICO


async def _manejar_validacion(_: Request, error: RequestValidationError) -> JSONResponse:
    errores = [{"campo": _campo(e), "mensaje": _mensaje(e)} for e in error.errors()]
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
