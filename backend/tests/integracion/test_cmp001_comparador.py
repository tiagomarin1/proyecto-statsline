"""CMP-001: POST /api/v1/comparaciones (RN-006, RN-007, RN-008, RN-017)."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos.enums import Posicion
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_equipo, crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/comparaciones"


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: date(2026, 10, 27)


def _jugador(session: Session, nombre: str, *, valor=None, liga=None, **stats) -> int:
    jugador = crear_jugador(session, nombre=nombre, valor_mercado_eur=valor)
    crear_estadistica(session, jugador=jugador, liga=liga, **stats)
    return jugador.id


def _fila(cuerpo: dict, metrica: str) -> dict:
    return next(fila for fila in cuerpo["filas"] if fila["metrica"] == metrica)


def test_cmp001_comparar_3_jugadores(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session, nombre="Primera Nacional")
    equipo = crear_equipo(session, nombre="Deportivo Norte")
    jugador = crear_jugador(
        session,
        nombre="Nahuel Ferreyra",
        fecha_nacimiento=date(2003, 4, 12),
        valor_mercado_eur=85000,
    )
    crear_estadistica(
        session,
        jugador=jugador,
        liga=liga,
        equipo=equipo,
        posicion=Posicion.defensor,
        minutos_jugados=2410,
    )
    otro = _jugador(session, "B", liga=liga)
    tercero = _jugador(session, "C", liga=liga)

    respuesta = cliente_con_sesion.post(URL, json={"jugador_ids": [jugador.id, otro, tercero]})

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert [j["id"] for j in cuerpo["jugadores"]] == [jugador.id, otro, tercero]
    assert cuerpo["jugadores"][0] == {
        "id": jugador.id,
        "nombre": "Nahuel Ferreyra",
        "posicion": "defensor",
        "edad": 23,
        "equipo": "Deportivo Norte",
        "liga": {"id": liga.id, "nombre": "Primera Nacional", "cobertura": "completa"},
        "temporada": 2026,
        "valor_mercado_eur": 85000,
    }
    assert [(f["metrica"], f["etiqueta"]) for f in cuerpo["filas"]] == [
        ("minutos_jugados", "Minutos jugados"),
        ("partidos_jugados", "Partidos jugados"),
        ("goles", "Goles"),
        ("asistencias", "Asistencias"),
        ("pases_precision_pct", "% pases completados"),
        ("duelos_ganados_pct", "% duelos ganados"),
        ("recuperaciones_por_partido", "Recuperaciones por partido"),
        ("rating", "Rating"),
    ]


def test_cmp001_un_solo_jugador_responde_400(cliente_con_sesion: TestClient, session: Session):
    respuesta = cliente_con_sesion.post(URL, json={"jugador_ids": [_jugador(session, "Solo")]})

    assert respuesta.status_code == 400
    assert respuesta.json() == {
        "detalle": "Se pueden comparar entre 2 y 3 jugadores.",
        "codigo": "cantidad_invalida",
    }


def test_cmp001_un_cuarto_jugador_responde_400(cliente_con_sesion: TestClient, session: Session):
    ids = [_jugador(session, f"J{n}") for n in range(4)]

    assert cliente_con_sesion.post(URL, json={"jugador_ids": ids}).status_code == 400


def test_cmp001_ids_repetidos_responde_400(cliente_con_sesion: TestClient, session: Session):
    jugador = _jugador(session, "Repetido")

    respuesta = cliente_con_sesion.post(URL, json={"jugador_ids": [jugador, jugador]})

    assert respuesta.status_code == 400


def test_cmp001_jugador_inexistente_responde_404(cliente_con_sesion: TestClient, session: Session):
    respuesta = cliente_con_sesion.post(
        URL, json={"jugador_ids": [_jugador(session, "Existe"), 999_999]}
    )

    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "jugador_inexistente"


def test_cmp001_sin_sesion_responde_401(cliente: TestClient):
    assert cliente.post(URL, json={"jugador_ids": [1, 2]}).status_code == 401


def test_cmp001_mejor_y_peor_con_empate(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    a = _jugador(session, "A", liga=liga, pases_precision_pct=87)
    b = _jugador(session, "B", liga=liga, pases_precision_pct=83)
    c = _jugador(session, "C", liga=liga, pases_precision_pct=87)

    fila = _fila(
        cliente_con_sesion.post(URL, json={"jugador_ids": [a, b, c]}).json(), "pases_precision_pct"
    )

    assert fila["valores"] == [87.0, 83.0, 87.0]
    assert (fila["mejor"], fila["peor"]) == ([a, c], [b])


def test_cmp001_dato_faltante_no_compite(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    comun = {"liga": liga, "duelos_totales": 100}
    a = _jugador(session, "A", duelos_ganados=61, **comun)
    b = _jugador(session, "B", liga=liga)
    c = _jugador(session, "C", duelos_ganados=58, **comun)

    fila = _fila(
        cliente_con_sesion.post(URL, json={"jugador_ids": [a, b, c]}).json(), "duelos_ganados_pct"
    )

    assert fila["valores"] == [61.0, None, 58.0]
    assert (fila["mejor"], fila["peor"]) == ([a], [c])


def test_cmp001_el_valor_de_mercado_va_aparte(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    a = _jugador(session, "A", liga=liga, valor=150_000)
    b = _jugador(session, "B", liga=liga, valor=95_000)
    c = _jugador(session, "C", liga=liga)

    cuerpo = cliente_con_sesion.post(URL, json={"jugador_ids": [a, b, c]}).json()

    assert "valor_mercado_eur" not in [fila["metrica"] for fila in cuerpo["filas"]]
    assert cuerpo["diferencia_valor_eur"] == 55_000
    assert cuerpo["mas_barato_id"] == b


def test_cmp001_si_menos_de_2_tienen_valor_no_hay_diferencia(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    a = _jugador(session, "A", liga=liga, valor=80_000)
    b = _jugador(session, "B", liga=liga)

    cuerpo = cliente_con_sesion.post(URL, json={"jugador_ids": [a, b]}).json()

    assert cuerpo["diferencia_valor_eur"] is None
    assert cuerpo["mas_barato_id"] == a


def test_cmp001_metricas_ganadas(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    a = _jugador(session, "A", liga=liga, goles=5, asistencias=1, minutos_jugados=900)
    b = _jugador(session, "B", liga=liga, goles=2, asistencias=4, minutos_jugados=900)

    cuerpo = cliente_con_sesion.post(URL, json={"jugador_ids": [a, b]}).json()

    # Goles: A. Asistencias: B. Minutos: empate, los dos son "Mejor".
    assert cuerpo["metricas_ganadas"] == {str(a): 2, str(b): 2}


def test_cmp001_se_pueden_comparar_jugadores_de_distinta_posicion(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    arquero = _jugador(session, "Arquero", liga=liga, posicion=Posicion.arquero)
    delantero = _jugador(session, "Delantero", liga=liga, posicion=Posicion.delantero)

    cuerpo = cliente_con_sesion.post(URL, json={"jugador_ids": [arquero, delantero]}).json()

    assert [j["posicion"] for j in cuerpo["jugadores"]] == ["arquero", "delantero"]


def test_cmp001_usa_la_estadistica_vigente(cliente_con_sesion: TestClient, session: Session):
    # RN-017: si jugó en dos equipos, se compara la fila con más minutos
    jugador = crear_jugador(session, nombre="Dos equipos")
    crear_estadistica(session, jugador=jugador, minutos_jugados=300, goles=9)
    crear_estadistica(session, jugador=jugador, minutos_jugados=1500, goles=2)
    otro = _jugador(session, "Otro", goles=1)

    cuerpo = cliente_con_sesion.post(URL, json={"jugador_ids": [jugador.id, otro]}).json()

    assert _fila(cuerpo, "goles")["valores"] == [2, 1]
