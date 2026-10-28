"""BUS-001 a BUS-003: validación de los filtros de búsqueda (RN-024)."""

import pytest
from pydantic import ValidationError

from app.esquemas.busqueda import FiltrosBusqueda


def test_bus001_un_filtro_vacio_equivale_a_sin_filtro():
    filtros = FiltrosBusqueda.model_validate(
        {"posicion": "", "edad_min": "", "liga_id": "", "pases_min": ""}
    )

    assert filtros.posicion is None
    assert filtros.edad_min is None
    assert filtros.liga_id is None
    assert filtros.pases_min is None


def test_bus001_edad_min_mayor_que_edad_max_es_invalido():
    with pytest.raises(ValidationError, match="edad mínima"):
        FiltrosBusqueda(edad_min=30, edad_max=25)


@pytest.mark.parametrize(
    "filtro",
    [
        {"edad_min": 14},
        {"edad_max": 46},
        {"pases_min": 101},
        {"duelos_min": -1},
        {"recuperaciones_min": 15.5},
        {"minutos_min": 5001},
        {"posicion": "lateral"},
    ],
)
def test_bus001_valores_fuera_de_rango_son_invalidos(filtro: dict):
    with pytest.raises(ValidationError):
        FiltrosBusqueda.model_validate(filtro)


def test_bus001_los_extremos_de_cada_rango_son_validos():
    filtros = FiltrosBusqueda(
        edad_min=15,
        edad_max=45,
        pases_min=100,
        duelos_min=0,
        recuperaciones_min=15,
        minutos_min=5000,
    )

    assert filtros.edad_max == 45
