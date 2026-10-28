"""BUS-004: GET /api/v1/jugadores?presupuesto_max_eur= (RN-003, RN-005, RN-016, RN-024)."""

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
HOY = date(2026, 10, 27)


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: HOY


def _nombres(respuesta) -> list[str]:
    return sorted(jugador["nombre"] for jugador in respuesta.json()["resultados"])


def _jugador_con_valor(session: Session, nombre: str, valor: int | None, **estadistica):
    jugador = crear_jugador(session, nombre=nombre, valor_mercado_eur=valor)
    return crear_estadistica(session, jugador=jugador, **estadistica)


def test_bus004_monto_maximo_incluye_el_limite(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    _jugador_con_valor(session, "Vale 100K", 100_000, liga=liga)
    _jugador_con_valor(session, "Vale 150K", 150_000, liga=liga)
    _jugador_con_valor(session, "Vale 150.001", 150_001, liga=liga)

    respuesta = cliente_con_sesion.get(URL, params={"presupuesto_max_eur": 150_000})

    assert respuesta.status_code == 200
    assert _nombres(respuesta) == ["Vale 100K", "Vale 150K"]
    assert respuesta.json()["total"] == 2


def test_bus004_jugador_sin_valor_queda_excluido_y_se_cuenta(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con_valor(session, "Con valor", 80_000, liga=liga)
    _jugador_con_valor(session, "Sin valor 1", None, liga=liga)
    _jugador_con_valor(session, "Sin valor 2", None, liga=liga)

    respuesta = cliente_con_sesion.get(URL, params={"presupuesto_max_eur": 150_000})

    assert _nombres(respuesta) == ["Con valor"]
    assert respuesta.json()["excluidos_sin_valor"] == 2


def test_bus004_excluidos_sin_valor_cuenta_solo_a_los_que_cumplen_los_demas_filtros(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con_valor(session, "Defensor sin valor", None, liga=liga, minutos_jugados=900)
    _jugador_con_valor(session, "Delantero sin valor", None, liga=liga, posicion=Posicion.delantero)
    _jugador_con_valor(session, "Defensor con pocos minutos", None, liga=liga, minutos_jugados=10)
    _jugador_con_valor(session, "Defensor caro", 300_000, liga=liga, minutos_jugados=900)

    respuesta = cliente_con_sesion.get(
        URL,
        params={"presupuesto_max_eur": 150_000, "posicion": "defensor", "minutos_min": 500},
    )

    assert respuesta.json()["total"] == 0
    assert respuesta.json()["excluidos_sin_valor"] == 1


def test_bus004_filtro_apagado_no_excluye_a_nadie(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    _jugador_con_valor(session, "Con valor", 80_000, liga=liga)
    _jugador_con_valor(session, "Sin valor", None, liga=liga)

    respuesta = cliente_con_sesion.get(URL)

    assert _nombres(respuesta) == ["Con valor", "Sin valor"]
    assert respuesta.json()["excluidos_sin_valor"] == 0
    sin_valor = next(j for j in respuesta.json()["resultados"] if j["nombre"] == "Sin valor")
    assert sin_valor["valor_mercado_eur"] is None


def test_bus004_el_presupuesto_se_combina_con_los_minimos_tacticos(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con_valor(session, "Barato y con pases", 50_000, liga=liga, pases_precision_pct=85)
    _jugador_con_valor(session, "Barato sin pases", 50_000, liga=liga)
    _jugador_con_valor(session, "Caro y con pases", 500_000, liga=liga, pases_precision_pct=90)

    respuesta = cliente_con_sesion.get(
        URL, params={"presupuesto_max_eur": 100_000, "pases_min": 80}
    )

    assert _nombres(respuesta) == ["Barato y con pases"]
    # RN-008: el que no tiene pases cumple el presupuesto y queda afuera solo por el dato
    assert respuesta.json()["excluidos_por_dato_faltante"] == 1


def test_bus004_rn016_sin_resultados_sugiere_relajar_el_presupuesto(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    for numero in range(3):
        _jugador_con_valor(session, f"Caro {numero}", 300_000, liga=liga)

    respuesta = cliente_con_sesion.get(URL, params={"presupuesto_max_eur": 100_000})

    assert respuesta.json()["total"] == 0
    assert respuesta.json()["sugerencia"] == {
        "filtro": "presupuesto_max_eur",
        "etiqueta": "el presupuesto",
        "cantidad": 3,
    }


@pytest.mark.parametrize("presupuesto", [10_000, 400_001])
def test_bus004_rn024_presupuesto_fuera_de_rango_responde_422(
    cliente_con_sesion: TestClient, presupuesto: int
):
    respuesta = cliente_con_sesion.get(URL, params={"presupuesto_max_eur": presupuesto})

    assert respuesta.status_code == 422
    assert respuesta.json()["errores"][0]["campo"] == "presupuesto_max_eur"
