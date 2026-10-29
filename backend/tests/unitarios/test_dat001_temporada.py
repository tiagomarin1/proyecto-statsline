"""DAT-001: temporada que se usa en cada liga (RN-027)."""

import pytest

from app.servicios.temporada import UMBRAL_JUGADORES_CON_MINUTOS, alcanza_para_usarse
from app.sincronizacion.mapeo import contar_jugadores_con_minutos, mapear_jugadores
from tests.api_football_falsa import cargar_fixture


def test_dat001_rn027_el_umbral_decidido_es_100_jugadores_con_minutos():
    assert UMBRAL_JUGADORES_CON_MINUTOS == 100


@pytest.mark.parametrize(
    ("jugadores_con_minutos", "esperado"), [(0, False), (99, False), (100, True), (850, True)]
)
def test_dat001_rn027_una_temporada_se_usa_desde_100_jugadores_con_minutos(
    jugadores_con_minutos, esperado
):
    assert alcanza_para_usarse(jugadores_con_minutos) is esperado


def test_dat001_rn027_el_umbral_se_puede_pasar():
    assert alcanza_para_usarse(10, umbral=10) is True
    assert alcanza_para_usarse(9, umbral=10) is False


def test_dat001_rn027_cuenta_jugadores_con_minutos_y_no_filas():
    # Página real de Primera Nacional 2025: 14 jugadores con minutos > 0. Los que tienen
    # minutos null o 0 no cuentan, y un jugador con dos filas cuenta una vez
    respuesta = cargar_fixture("players_liga_basica_129_2025_p1")["response"]

    assert contar_jugadores_con_minutos(mapear_jugadores(respuesta, 129)) == 14
