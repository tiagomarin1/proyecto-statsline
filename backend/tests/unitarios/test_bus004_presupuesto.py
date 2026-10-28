"""BUS-004: regla del presupuesto (RN-005) y validación del filtro (RN-024)."""

import pytest
from pydantic import ValidationError

from app.esquemas.busqueda import FiltrosBusqueda
from app.servicios.presupuesto import entra_en_presupuesto


@pytest.mark.parametrize(
    ("valor_mercado_eur", "presupuesto_max_eur", "esperado"),
    [
        # Ejemplo de RN-005 con un presupuesto de €150.000
        (150_000, 150_000, True),
        (150_001, 150_000, False),
        (None, 150_000, False),
        (0, 150_000, True),
        # Sin presupuesto no se filtra a nadie, tenga o no valor
        (None, None, True),
        (999_999_999, None, True),
    ],
)
def test_bus004_rn005_entra_en_presupuesto(valor_mercado_eur, presupuesto_max_eur, esperado):
    assert entra_en_presupuesto(valor_mercado_eur, presupuesto_max_eur) is esperado


def test_bus004_el_presupuesto_arranca_apagado():
    assert FiltrosBusqueda().presupuesto_max_eur is None


def test_bus004_un_presupuesto_vacio_equivale_a_sin_filtro():
    assert FiltrosBusqueda.model_validate({"presupuesto_max_eur": ""}).presupuesto_max_eur is None


@pytest.mark.parametrize("presupuesto", [20_000, 150_000, 400_000])
def test_bus004_rn024_los_extremos_del_rango_son_validos(presupuesto):
    assert FiltrosBusqueda(presupuesto_max_eur=presupuesto).presupuesto_max_eur == presupuesto


@pytest.mark.parametrize("presupuesto", [19_999, 400_001, -1])
def test_bus004_rn024_un_presupuesto_fuera_de_rango_es_invalido(presupuesto):
    with pytest.raises(ValidationError):
        FiltrosBusqueda(presupuesto_max_eur=presupuesto)
