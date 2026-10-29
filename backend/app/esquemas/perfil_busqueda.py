"""Perfil de búsqueda (BUS-005, RN-023). Rangos de RN-024."""

from typing import Annotated

from pydantic import BaseModel, model_validator

from app.esquemas.busqueda import (
    Edad,
    Minutos,
    Porcentaje,
    Presupuesto,
    Recuperaciones,
    SinFiltroSiVacio,
    validar_rango_de_edad,
)
from app.modelos.enums import Posicion


class PerfilBusquedaBase(BaseModel):
    """`PerfilBusqueda` del contrato. Los opcionales en null = sin ese filtro."""

    presupuesto_max_eur: Presupuesto = None
    pases_min: Porcentaje = None
    duelos_min: Porcentaje = None
    recuperaciones_min: Recuperaciones = None
    minutos_min: Minutos = None


class PedidoPerfilBusqueda(PerfilBusquedaBase):
    """Posición, liga y edad son obligatorias (RN-023), pero acá son opcionales a propósito:
    servicios/perfil_busqueda.py arma el mensaje con todo lo que falta."""

    posicion: Annotated[Posicion | None, SinFiltroSiVacio] = None
    liga_id: Annotated[int | None, SinFiltroSiVacio] = None
    edad_min: Edad = None
    edad_max: Edad = None

    @model_validator(mode="after")
    def edad_min_hasta_edad_max(self) -> "PedidoPerfilBusqueda":
        validar_rango_de_edad(self.edad_min, self.edad_max)
        return self


class RespuestaPerfilBusqueda(PerfilBusquedaBase):
    posicion: Posicion
    liga_id: int
    edad_min: int
    edad_max: int
