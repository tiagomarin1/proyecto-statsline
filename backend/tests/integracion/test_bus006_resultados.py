"""BUS-006: orden, paginado y sugerencia sin resultados (RN-016, RN-021)."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos.enums import Posicion
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/jugadores"


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: date(2026, 10, 27)


def _nombres(respuesta) -> list[str]:
    return [jugador["nombre"] for jugador in respuesta.json()["resultados"]]


def _jugador(session: Session, nombre: str, *, nacimiento=date(2000, 1, 1), valor=None, **stats):
    jugador = crear_jugador(
        session, nombre=nombre, fecha_nacimiento=nacimiento, valor_mercado_eur=valor
    )
    return crear_estadistica(session, jugador=jugador, **stats)


@pytest.fixture
def liga(session: Session):
    return crear_liga(session)


def test_bus006_orden_por_defecto_minutos_con_nulos_al_final(
    cliente_con_sesion: TestClient, session: Session, liga
):
    _jugador(session, "Sin minutos", liga=liga)
    _jugador(session, "Pocos", liga=liga, minutos_jugados=100)
    _jugador(session, "Muchos", liga=liga, minutos_jugados=2000)

    assert _nombres(cliente_con_sesion.get(URL)) == ["Muchos", "Pocos", "Sin minutos"]


def test_bus006_orden_por_valor_menor_primero_con_los_sin_valor_al_final(
    cliente_con_sesion: TestClient, session: Session, liga
):
    _jugador(session, "Sin valor", liga=liga)
    _jugador(session, "Caro", liga=liga, valor=300_000)
    _jugador(session, "Barato", liga=liga, valor=50_000)

    respuesta = cliente_con_sesion.get(URL, params={"orden": "valor"})

    assert _nombres(respuesta) == ["Barato", "Caro", "Sin valor"]


def test_bus006_orden_por_edad_menor_primero(
    cliente_con_sesion: TestClient, session: Session, liga
):
    _jugador(session, "Sin fecha", liga=liga, nacimiento=None)
    _jugador(session, "Veterano", liga=liga, nacimiento=date(1990, 1, 1))
    _jugador(session, "Pibe", liga=liga, nacimiento=date(2006, 1, 1))

    respuesta = cliente_con_sesion.get(URL, params={"orden": "edad"})

    assert _nombres(respuesta) == ["Pibe", "Veterano", "Sin fecha"]


@pytest.mark.parametrize(
    ("orden", "metrica"), [("pases", "pases_precision_pct"), ("rating", "rating")]
)
def test_bus006_orden_por_pases_y_rating_de_mayor_a_menor(
    cliente_con_sesion: TestClient, session: Session, liga, orden: str, metrica: str
):
    _jugador(session, "Sin dato", liga=liga)
    _jugador(session, "Bajo", liga=liga, **{metrica: 6})
    _jugador(session, "Alto", liga=liga, **{metrica: 8})

    assert _nombres(cliente_con_sesion.get(URL, params={"orden": orden})) == [
        "Alto",
        "Bajo",
        "Sin dato",
    ]


def test_bus006_con_empate_se_ordena_por_nombre(
    cliente_con_sesion: TestClient, session: Session, liga
):
    _jugador(session, "Zárate", liga=liga, minutos_jugados=900)
    _jugador(session, "Acosta", liga=liga, minutos_jugados=900)

    assert _nombres(cliente_con_sesion.get(URL)) == ["Acosta", "Zárate"]


def test_bus006_orden_desconocido_responde_422(cliente_con_sesion: TestClient):
    assert cliente_con_sesion.get(URL, params={"orden": "score"}).status_code == 422


def test_bus006_paginado_de_14_resultados_en_paginas_de_6(
    cliente_con_sesion: TestClient, session: Session, liga
):
    for numero in range(14):
        _jugador(session, f"Jugador {numero:02d}", liga=liga, minutos_jugados=1000 - numero)

    primera = cliente_con_sesion.get(URL).json()
    tercera = cliente_con_sesion.get(URL, params={"pagina": 3}).json()
    cuarta = cliente_con_sesion.get(URL, params={"pagina": 4}).json()

    assert (primera["total"], primera["pagina"], primera["tamano"]) == (14, 1, 6)
    assert len(primera["resultados"]) == 6
    assert [j["nombre"] for j in tercera["resultados"]] == ["Jugador 12", "Jugador 13"]
    assert cuarta["resultados"] == []
    assert cuarta["total"] == 14


def test_bus006_sin_resultados_sugiere_el_filtro_que_mas_resultados_da(
    cliente_con_sesion: TestClient, session: Session, liga
):
    for numero in range(7):
        _jugador(session, f"Defensor {numero}", liga=liga, pases_precision_pct=70)
    _jugador(session, "Arquero", liga=liga, posicion=Posicion.arquero, pases_precision_pct=90)

    respuesta = cliente_con_sesion.get(URL, params={"posicion": "defensor", "pases_min": 85})

    assert respuesta.json()["total"] == 0
    assert respuesta.json()["sugerencia"] == {
        "filtro": "pases_min",
        "etiqueta": "el mínimo de pases",
        "cantidad": 7,
    }


def test_bus006_con_resultados_no_hay_sugerencia(
    cliente_con_sesion: TestClient, session: Session, liga
):
    _jugador(session, "Defensor", liga=liga)

    assert cliente_con_sesion.get(URL, params={"posicion": "defensor"}).json()["sugerencia"] is None


def test_bus006_si_relajar_un_filtro_tampoco_da_resultados_no_hay_sugerencia(
    cliente_con_sesion: TestClient, session: Session, liga
):
    _jugador(session, "Defensor sin pases", liga=liga, minutos_jugados=100)

    # Sacando cualquiera de los dos mínimos, el otro sigue dejando al jugador afuera
    respuesta = cliente_con_sesion.get(URL, params={"pases_min": 80, "minutos_min": 1000})

    assert respuesta.json()["sugerencia"] is None


def test_bus006_relajar_el_filtro_sugerido_trae_esa_cantidad(
    cliente_con_sesion: TestClient, session: Session, liga
):
    otra_liga = crear_liga(session)
    for numero in range(3):
        _jugador(session, f"De otra liga {numero}", liga=otra_liga)

    con_liga = cliente_con_sesion.get(URL, params={"liga_id": liga.id}).json()
    sugerencia = con_liga["sugerencia"]
    relajada = cliente_con_sesion.get(URL).json()

    assert sugerencia == {"filtro": "liga_id", "etiqueta": "la liga", "cantidad": 3}
    assert relajada["total"] == sugerencia["cantidad"]
