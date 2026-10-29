"""BUS-001 a BUS-003: validación de los filtros de búsqueda (RN-024)."""

import importlib
import inspect
import pkgutil

import pytest
from pydantic import BaseModel, ValidationError

import app.esquemas
from app.esquemas.busqueda import FiltrosBusqueda, _edad_max_desde_edad_min


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


def _esquemas_con_edad_maxima() -> list[type[BaseModel]]:
    modulos = [
        importlib.import_module(f"app.esquemas.{modulo.name}")
        for modulo in pkgutil.iter_modules(app.esquemas.__path__)
    ]
    return [
        clase
        for modulo in modulos
        for _, clase in inspect.getmembers(modulo, inspect.isclass)
        if issubclass(clase, BaseModel)
        and "edad_max" in clase.model_fields
        and any(
            getattr(validador, "func", None) is _edad_max_desde_edad_min
            for validador in clase.model_fields["edad_max"].metadata
        )
    ]


def test_bus001_edad_max_se_declara_despues_de_edad_min():
    """El validador de edad_max lee edad_min de info.data: si edad_min se valida después, la
    regla deja de correr sin avisar y el CHECK de la base responde 500."""
    esquemas = _esquemas_con_edad_maxima()

    assert esquemas, "Ningún esquema usa EdadMaxima: el test no está mirando nada."
    for esquema in esquemas:
        campos = list(esquema.model_fields)
        assert "edad_min" in campos, esquema.__name__
        assert campos.index("edad_min") < campos.index("edad_max"), esquema.__name__


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
