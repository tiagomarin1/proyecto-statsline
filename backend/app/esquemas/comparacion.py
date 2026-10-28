"""Pedido y respuesta de POST /comparaciones (CONTRATO_DE_API.md)."""

from pydantic import BaseModel

from app.esquemas.busqueda import LigaResumen
from app.modelos.enums import Posicion


class PedidoComparacion(BaseModel):
    jugador_ids: list[int]


class JugadorComparado(BaseModel):
    id: int
    nombre: str
    posicion: Posicion | None
    edad: int | None
    equipo: str
    liga: LigaResumen
    temporada: int
    valor_mercado_eur: int | None


class FilaComparacion(BaseModel):
    """Una métrica de RN-001. `valores` va en el orden de `jugadores`; null = no disponible."""

    metrica: str
    etiqueta: str
    valores: list[float | None]
    mejor: list[int]
    peor: list[int]


class RespuestaComparacion(BaseModel):
    jugadores: list[JugadorComparado]
    filas: list[FilaComparacion]
    metricas_ganadas: dict[str, int]
    diferencia_valor_eur: int | None
    mas_barato_id: int | None
