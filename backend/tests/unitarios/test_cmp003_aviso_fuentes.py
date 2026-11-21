"""CMP-003: el aviso del comparador cuando los jugadores vienen de fuentes distintas (RN-029)."""

from app.modelos.enums import FuenteDatos
from app.servicios.comparacion import MENSAJE_FUENTES_DISTINTAS, avisar_fuentes_distintas

API_FOOTBALL = FuenteDatos.api_football
SPORTMONKS = FuenteDatos.sportmonks


def test_cmp003_con_fuentes_distintas_hay_aviso():
    assert avisar_fuentes_distintas([API_FOOTBALL, SPORTMONKS]) == MENSAJE_FUENTES_DISTINTAS


def test_cmp003_con_la_misma_fuente_no_hay_aviso():
    assert avisar_fuentes_distintas([SPORTMONKS, SPORTMONKS]) is None
    assert avisar_fuentes_distintas([API_FOOTBALL, API_FOOTBALL, API_FOOTBALL]) is None


def test_cmp003_con_tres_jugadores_alcanza_con_que_uno_sea_de_otra_fuente():
    assert avisar_fuentes_distintas([API_FOOTBALL, API_FOOTBALL, SPORTMONKS]) is not None


def test_cmp003_el_aviso_no_nombra_las_fuentes():
    for fuente in ("Sportmonks", "API-Football", "api_football", "sportmonks"):
        assert fuente.lower() not in MENSAJE_FUENTES_DISTINTAS.lower()
    assert MENSAJE_FUENTES_DISTINTAS == (
        "El rating y los porcentajes vienen de fuentes distintas y no son directamente comparables."
    )
