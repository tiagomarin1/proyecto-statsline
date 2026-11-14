"""JUG-003: GET /api/v1/jugadores/{id} devuelve la trayectoria del jugador (RN-008, RN-032)."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos import Trayectoria
from app.modelos.base import ahora_utc
from app.modelos.enums import Posicion
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_equipo, crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/jugadores"
HOY = date(2026, 10, 27)
ID_MERLO = 8383


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: HOY


def _jugador_en_merlo(session: Session, *, sincronizada: bool):
    liga = crear_liga(session, nombre="Primera B Metropolitana")
    equipo = crear_equipo(session, nombre="Deportivo Merlo", id_api_football=ID_MERLO)
    jugador = crear_jugador(session, nombre="P. Fernández")
    crear_estadistica(
        session,
        jugador=jugador,
        liga=liga,
        equipo=equipo,
        posicion=Posicion.defensor,
        minutos_jugados=1500,
    )
    if sincronizada:
        jugador.trayectoria_sincronizada_en = ahora_utc()
        session.flush()
    return jugador


def _paso(session: Session, jugador, club_id: int, nombre: str, temporada: int | None) -> None:
    session.add(
        Trayectoria(
            jugador_id=jugador.id,
            id_club_api_football=club_id,
            nombre_club=nombre,
            temporada=temporada,
        )
    )
    session.flush()


def test_jug003_la_ficha_trae_la_trayectoria_agrupada_con_el_club_actual_primero(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = _jugador_en_merlo(session, sincronizada=True)
    for temporada in (2024, 2025):
        _paso(session, jugador, ID_MERLO, "Deportivo Merlo", temporada)
    _paso(session, jugador, 1948, "Atlanta", 2023)
    for temporada in (2008, 2010, 2011, 2016, 2017):
        _paso(session, jugador, 447, "Chacarita Juniors", temporada)

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert ficha["trayectoria"] == [
        {"club": "Deportivo Merlo", "actual": True, "tramos": [{"desde": 2024, "hasta": 2025}]},
        {"club": "Atlanta", "actual": False, "tramos": [{"desde": 2023, "hasta": 2023}]},
        {
            "club": "Chacarita Juniors",
            "actual": False,
            "tramos": [
                {"desde": 2016, "hasta": 2017},
                {"desde": 2010, "hasta": 2011},
                {"desde": 2008, "hasta": 2008},
            ],
        },
    ]


def test_jug003_si_la_trayectoria_nunca_se_sincronizo_es_null(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = _jugador_en_merlo(session, sincronizada=False)

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert ficha["trayectoria"] is None


def test_jug003_un_jugador_sincronizado_sin_historial_muestra_solo_su_club_actual(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = _jugador_en_merlo(session, sincronizada=True)

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert ficha["trayectoria"] == [{"club": "Deportivo Merlo", "actual": True, "tramos": []}]


def test_jug003_un_club_actual_que_no_esta_en_la_trayectoria_se_muestra_igual(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = _jugador_en_merlo(session, sincronizada=True)
    _paso(session, jugador, 1948, "Atlanta", 2023)

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert [(c["club"], c["actual"]) for c in ficha["trayectoria"]] == [
        ("Deportivo Merlo", True),
        ("Atlanta", False),
    ]


def test_jug003_un_club_sin_temporada_aparece_al_final_sin_tramos(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = _jugador_en_merlo(session, sincronizada=True)
    _paso(session, jugador, 19042, "Vargas Torres", None)
    _paso(session, jugador, 1948, "Atlanta", 2023)

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert [c["club"] for c in ficha["trayectoria"]] == [
        "Deportivo Merlo",
        "Atlanta",
        "Vargas Torres",
    ]
    assert ficha["trayectoria"][-1]["tramos"] == []


def test_jug003_la_trayectoria_de_un_jugador_no_se_mezcla_con_la_de_otro(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = _jugador_en_merlo(session, sincronizada=True)
    otro = crear_jugador(session)
    _paso(session, otro, 555, "Club del otro", 2020)

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert [c["club"] for c in ficha["trayectoria"]] == ["Deportivo Merlo"]
