"""CMP-003: POST /api/v1/comparaciones avisa cuando los jugadores vienen de fuentes distintas."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos import Liga
from app.modelos.enums import FuenteDatos
from app.servicios.comparacion import MENSAJE_FUENTES_DISTINTAS
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/comparaciones"


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: date(2026, 10, 27)


def _liga(session: Session, nombre: str, fuente: FuenteDatos) -> Liga:
    liga = crear_liga(session, nombre=nombre)
    liga.fuente = fuente
    session.flush()
    return liga


def _jugador(session: Session, liga: Liga, **stats) -> int:
    jugador = crear_jugador(session)
    crear_estadistica(session, jugador=jugador, liga=liga, **stats)
    return jugador.id


def _comparar(cliente: TestClient, *ids: int) -> dict:
    respuesta = cliente.post(URL, json={"jugador_ids": list(ids)})
    assert respuesta.status_code == 200
    return respuesta.json()


def test_cmp003_jugadores_de_fuentes_distintas_traen_el_aviso_y_la_comparacion_sigue_igual(
    cliente_con_sesion: TestClient, session: Session
):
    profesional = _liga(session, "Liga Profesional", FuenteDatos.api_football)
    nacional = _liga(session, "Primera Nacional", FuenteDatos.sportmonks)
    a = _jugador(session, profesional, pases_precision_pct=87, rating=7.1)
    b = _jugador(session, nacional, pases_precision_pct=83, rating=7.4)

    cuerpo = _comparar(cliente_con_sesion, a, b)

    assert cuerpo["aviso_fuentes"] == MENSAJE_FUENTES_DISTINTAS
    pases = next(f for f in cuerpo["filas"] if f["metrica"] == "pases_precision_pct")
    assert pases["mejor"] == [a]
    assert pases["peor"] == [b]


def test_cmp003_jugadores_de_la_misma_fuente_no_traen_aviso(
    cliente_con_sesion: TestClient, session: Session
):
    nacional = _liga(session, "Primera Nacional", FuenteDatos.sportmonks)
    federal = _liga(session, "Torneo Federal A", FuenteDatos.sportmonks)
    a = _jugador(session, nacional, rating=7.0)
    b = _jugador(session, federal, rating=6.8)

    assert _comparar(cliente_con_sesion, a, b)["aviso_fuentes"] is None


def test_cmp003_con_tres_jugadores_alcanza_con_uno_de_otra_fuente(
    cliente_con_sesion: TestClient, session: Session
):
    profesional = _liga(session, "Liga Profesional", FuenteDatos.api_football)
    nacional = _liga(session, "Primera Nacional", FuenteDatos.sportmonks)
    a = _jugador(session, profesional)
    b = _jugador(session, profesional)
    c = _jugador(session, nacional)

    assert _comparar(cliente_con_sesion, a, b, c)["aviso_fuentes"] == MENSAJE_FUENTES_DISTINTAS
