"""Perfil de búsqueda (BUS-005, RN-023). Rangos de RN-024."""

from typing import Annotated

from pydantic import BaseModel, Field, model_validator

from app.esquemas.busqueda import Edad, Minutos, Porcentaje, Recuperaciones, SinFiltroSiVacio
from app.modelos.enums import Posicion

PRESUPUESTO_MINIMO_EUR = 20_000  # RN-003
PRESUPUESTO_MAXIMO_EUR = 400_000

Presupuesto = Annotated[
    Annotated[int, Field(ge=PRESUPUESTO_MINIMO_EUR, le=PRESUPUESTO_MAXIMO_EUR)] | None,
    SinFiltroSiVacio,
]


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
        ambas = self.edad_min is not None and self.edad_max is not None
        if ambas and self.edad_min > self.edad_max:
            raise ValueError("La edad mínima no puede ser mayor que la edad máxima.")
        return self


class RespuestaPerfilBusqueda(PerfilBusquedaBase):
    posicion: Posicion
    liga_id: int
    edad_min: int
    edad_max: int
