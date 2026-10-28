"""Filtros y respuesta de GET /jugadores (CONTRATO_DE_API.md). Rangos de RN-024."""

from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, Field, model_validator

from app.modelos.enums import Cobertura, Posicion

EDAD_MINIMA = 15
EDAD_MAXIMA = 45
PORCENTAJE_MAXIMO = 100
RECUPERACIONES_MAXIMAS = 15
MINUTOS_MAXIMOS = 5000
TAMANO_PAGINA_POR_DEFECTO = 6  # RN-021
TAMANO_PAGINA_MAXIMO = 50


class OrdenBusqueda(StrEnum):
    """RN-021: opciones de orden de los resultados."""

    minutos = "minutos"
    valor = "valor"
    edad = "edad"
    pases = "pases"
    rating = "rating"


def _vacio_a_none(valor: Any) -> Any:
    """RN-024: un filtro vacío equivale a "sin filtro"."""
    return None if valor == "" else valor


SinFiltroSiVacio = BeforeValidator(_vacio_a_none)
# Los rangos van dentro del Optional: así "" → None no choca con ge/le
Edad = Annotated[Annotated[int, Field(ge=EDAD_MINIMA, le=EDAD_MAXIMA)] | None, SinFiltroSiVacio]
Porcentaje = Annotated[Annotated[float, Field(ge=0, le=PORCENTAJE_MAXIMO)] | None, SinFiltroSiVacio]
Recuperaciones = Annotated[
    Annotated[float, Field(ge=0, le=RECUPERACIONES_MAXIMAS)] | None, SinFiltroSiVacio
]
Minutos = Annotated[Annotated[int, Field(ge=0, le=MINUTOS_MAXIMOS)] | None, SinFiltroSiVacio]


class FiltrosBusqueda(BaseModel):
    posicion: Annotated[Posicion | None, SinFiltroSiVacio] = None
    edad_min: Edad = None
    edad_max: Edad = None
    liga_id: Annotated[int | None, SinFiltroSiVacio] = None
    pases_min: Porcentaje = None
    duelos_min: Porcentaje = None
    recuperaciones_min: Recuperaciones = None
    minutos_min: Minutos = None
    orden: Annotated[
        OrdenBusqueda, BeforeValidator(lambda valor: valor or OrdenBusqueda.minutos)
    ] = OrdenBusqueda.minutos
    pagina: Annotated[int, Field(ge=1)] = 1
    tamano: Annotated[int, Field(ge=1, le=TAMANO_PAGINA_MAXIMO)] = TAMANO_PAGINA_POR_DEFECTO

    @model_validator(mode="after")
    def edad_min_hasta_edad_max(self) -> "FiltrosBusqueda":
        ambas = self.edad_min is not None and self.edad_max is not None
        if ambas and self.edad_min > self.edad_max:
            raise ValueError("La edad mínima no puede ser mayor que la edad máxima.")
        return self


class LigaResumen(BaseModel):
    id: int
    nombre: str
    cobertura: Cobertura


class LigaRespuesta(LigaResumen):
    temporada_actual: int


class JugadorResumen(BaseModel):
    """Fila de resultados. null = dato no disponible, nunca 0 (RN-008)."""

    id: int
    nombre: str
    posicion: Posicion | None
    edad: int | None
    equipo: str
    liga: LigaResumen
    temporada: int
    minutos_jugados: int | None
    pases_precision_pct: float | None
    duelos_ganados_pct: float | None
    recuperaciones_por_partido: float | None
    rating: float | None
    valor_mercado_eur: int | None
    en_seguimiento: bool


class Sugerencia(BaseModel):
    """RN-016: qué filtro relajar cuando no hay resultados y cuántos aparecerían."""

    filtro: str
    etiqueta: str
    cantidad: int


class RespuestaBusqueda(BaseModel):
    resultados: list[JugadorResumen]
    total: int
    pagina: int
    tamano: int
    excluidos_por_dato_faltante: int  # RN-008
    excluidos_sin_valor: int  # RN-005 (BUS-004)
    liga_sin_datos: bool  # BUS-002
    sugerencia: Sugerencia | None  # RN-016
