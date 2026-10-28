"""BUS-005: el perfil necesita posición, liga y rango de edad (RN-023)."""

import pytest

from app.esquemas.perfil_busqueda import PedidoPerfilBusqueda
from app.servicios.perfil_busqueda import faltantes, mensaje_de_faltantes

COMPLETO = {"posicion": "defensor", "liga_id": 1, "edad_min": 20, "edad_max": 27}


def _faltantes(**cambios) -> list[str]:
    return faltantes(PedidoPerfilBusqueda(**(COMPLETO | cambios)))


def test_bus005_completo_no_le_falta_nada():
    assert _faltantes() == []


@pytest.mark.parametrize(
    ("cambios", "esperado"),
    [
        ({"liga_id": None}, ["liga_id"]),
        ({"posicion": None, "liga_id": None}, ["posicion", "liga_id"]),
        ({"edad_max": None}, ["edad"]),
        ({"edad_min": None, "edad_max": None}, ["edad"]),
    ],
)
def test_bus005_detecta_lo_que_falta(cambios: dict, esperado: list[str]):
    assert _faltantes(**cambios) == esperado


@pytest.mark.parametrize(
    ("faltan", "mensaje"),
    [
        (["liga_id"], "Para guardar el perfil falta elegir la liga."),
        (["posicion", "liga_id"], "Para guardar el perfil falta elegir la posición y la liga."),
        (
            ["posicion", "liga_id", "edad"],
            "Para guardar el perfil falta elegir la posición, la liga y el rango de edad.",
        ),
    ],
)
def test_bus005_mensaje_de_rn023(faltan: list[str], mensaje: str):
    assert mensaje_de_faltantes(faltan) == mensaje
