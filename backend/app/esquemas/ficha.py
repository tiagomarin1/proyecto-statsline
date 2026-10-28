"""Respuesta de GET /jugadores/{id} (CONTRATO_DE_API.md). null = dato no disponible (RN-008)."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel

from app.esquemas.busqueda import LigaResumen
from app.modelos.enums import Posicion

FUENTE_VALOR_MERCADO = "Transfermarkt"


class Metricas(BaseModel):
    """Métricas de rendimiento de RN-001, redondeadas para mostrar (RN-018)."""

    partidos_jugados: int | None
    minutos_jugados: int | None
    goles: int | None
    asistencias: int | None
    pases_precision_pct: float | None
    duelos_ganados_pct: float | None
    recuperaciones_por_partido: float | None
    rating: float | None


class PromediosPosicion(BaseModel):
    """RN-015: promedio de cada métrica entre los jugadores de la misma posición."""

    partidos_jugados: float | None
    minutos_jugados: float | None
    goles: float | None
    asistencias: float | None
    pases_precision_pct: float | None
    duelos_ganados_pct: float | None
    recuperaciones_por_partido: float | None
    rating: float | None


class ValorMercado(BaseModel):
    """RN-002 y RN-004: valor en EUR de Transfermarkt. La ficha muestra la fecha como leyenda."""

    eur: int
    fecha: date | None
    fuente: str = FUENTE_VALOR_MERCADO


class EstadoCriterio(StrEnum):
    cumple = "cumple"
    no_cumple = "no_cumple"
    no_disponible = "no_disponible"


class CriterioCoincidencia(BaseModel):
    criterio: str
    estado: EstadoCriterio
    texto: str


class Coincidencia(BaseModel):
    """RN-012: "Cumple X de N criterios". No es un porcentaje."""

    cumple: int
    total: int
    criterios: list[CriterioCoincidencia]


class FichaJugador(BaseModel):
    id: int
    nombre: str
    posicion: Posicion | None
    edad: int | None
    fecha_nacimiento: date | None
    nacionalidad: str | None
    equipo: str
    liga: LigaResumen
    temporada: int
    metricas: Metricas
    promedios_posicion: PromediosPosicion
    valor_mercado: ValorMercado | None
    en_seguimiento: bool
    coincidencia: Coincidencia | None  # null si no se mandaron filtros
