"""INF-001: el seed del E2E de la demo nunca corre contra producción (TESTING_STRATEGY.md)."""

import pytest

from semillas.demo_e2e import ErrorEntornoProduccion, verificar_entorno


def test_inf001_el_seed_de_la_demo_no_corre_en_produccion():
    # Pisaría los valores de mercado reales y cargaría solo los jugadores de los fixtures
    with pytest.raises(ErrorEntornoProduccion, match="producción"):
        verificar_entorno("produccion")


@pytest.mark.parametrize("entorno", ["desarrollo", "test"])
def test_inf001_el_seed_de_la_demo_corre_en_desarrollo_y_test(entorno):
    verificar_entorno(entorno)
