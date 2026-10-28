"""JUG-001: GET /api/v1/jugadores/{id} (RN-001, RN-002, RN-008, RN-012, RN-015, RN-017, RN-018)."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos import Seguimiento
from app.modelos.enums import Cobertura, Posicion
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_equipo, crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/jugadores"
HOY = date(2026, 10, 27)


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: HOY


def _defensor_completo(session: Session, **jugador):
    liga = crear_liga(session, nombre="Liga Profesional")
    equipo = crear_equipo(session, nombre="Racing Club")
    defensor = crear_jugador(
        session,
        nombre="Nahuel Ferreyra",
        fecha_nacimiento=date(2003, 4, 12),
        valor_mercado_eur=85_000,
        valor_mercado_fecha=date(2026, 7, 6),
        **jugador,
    )
    crear_estadistica(
        session,
        jugador=defensor,
        liga=liga,
        equipo=equipo,
        posicion=Posicion.defensor,
        partidos_jugados=28,
        minutos_jugados=2410,
        goles=1,
        asistencias=4,
        pases_precision_pct=86.6,
        duelos_totales=100,
        duelos_ganados=61,
        rating=7.123,
        intercepciones=52,
    )
    return defensor, liga


def test_jug001_sin_sesion_responde_401(cliente: TestClient, session: Session):
    defensor, _ = _defensor_completo(session)

    assert cliente.get(f"{URL}/{defensor.id}").status_code == 401


def test_jug001_abrir_ficha(cliente_con_sesion: TestClient, session: Session):
    defensor, liga = _defensor_completo(session)

    respuesta = cliente_con_sesion.get(f"{URL}/{defensor.id}")

    assert respuesta.status_code == 200
    ficha = respuesta.json()
    assert ficha["id"] == defensor.id
    assert ficha["nombre"] == "Nahuel Ferreyra"
    assert ficha["posicion"] == "defensor"
    assert ficha["edad"] == 23
    assert ficha["fecha_nacimiento"] == "2003-04-12"
    assert ficha["nacionalidad"] == "Argentina"
    assert ficha["equipo"] == "Racing Club"
    assert ficha["liga"] == {"id": liga.id, "nombre": "Liga Profesional", "cobertura": "completa"}
    assert ficha["temporada"] == liga.temporada_actual
    assert ficha["metricas"] == {
        "partidos_jugados": 28,
        "minutos_jugados": 2410,
        "goles": 1,
        "asistencias": 4,
        "pases_precision_pct": 87.0,
        "duelos_ganados_pct": 61.0,
        "recuperaciones_por_partido": 1.9,
        "rating": 7.12,
    }
    assert ficha["valor_mercado"] == {
        "eur": 85_000,
        "fecha": "2026-07-06",
        "fuente": "Transfermarkt",
    }
    assert ficha["en_seguimiento"] is False
    assert ficha["coincidencia"] is None


def test_jug001_rn015_promedio_de_la_posicion_ignora_los_nulos(
    cliente_con_sesion: TestClient, session: Session
):
    # Ejemplo de RN-015: defensores con pases 86, null y 84 → 85,0
    liga = crear_liga(session)
    otra_liga = crear_liga(session)
    defensor = crear_jugador(session)
    crear_estadistica(session, jugador=defensor, liga=liga, pases_precision_pct=86, goles=3)
    crear_estadistica(session, liga=liga, pases_precision_pct=None, goles=1)
    crear_estadistica(session, liga=otra_liga, pases_precision_pct=84, goles=None)
    crear_estadistica(session, liga=liga, posicion=Posicion.delantero, pases_precision_pct=10)

    promedios = cliente_con_sesion.get(f"{URL}/{defensor.id}").json()["promedios_posicion"]

    assert promedios["pases_precision_pct"] == 85.0
    assert promedios["goles"] == 2.0
    # Nadie tiene el dato: null, nunca 0
    assert promedios["rating"] is None
    assert promedios["duelos_ganados_pct"] is None


def test_jug001_datos_insuficientes_no_rompen_la_ficha(
    cliente_con_sesion: TestClient, session: Session
):
    primera_c = crear_liga(session, nombre="Primera C", cobertura=Cobertura.basica)
    jugador = crear_jugador(session, valor_mercado_eur=None)
    crear_estadistica(session, jugador=jugador, liga=primera_c, minutos_jugados=900)

    respuesta = cliente_con_sesion.get(f"{URL}/{jugador.id}")

    assert respuesta.status_code == 200
    ficha = respuesta.json()
    assert ficha["liga"]["cobertura"] == "basica"
    assert ficha["metricas"]["minutos_jugados"] == 900
    assert ficha["metricas"]["pases_precision_pct"] is None
    assert ficha["metricas"]["duelos_ganados_pct"] is None
    assert ficha["metricas"]["recuperaciones_por_partido"] is None
    assert ficha["valor_mercado"] is None


def test_jug001_rn017_usa_la_fila_con_mas_minutos(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    jugador = crear_jugador(session)
    crear_estadistica(
        session,
        jugador=jugador,
        liga=liga,
        equipo=crear_equipo(session, nombre="Club viejo"),
        minutos_jugados=90,
    )
    crear_estadistica(
        session,
        jugador=jugador,
        liga=liga,
        equipo=crear_equipo(session, nombre="Club nuevo"),
        minutos_jugados=1382,
    )

    ficha = cliente_con_sesion.get(f"{URL}/{jugador.id}").json()

    assert ficha["equipo"] == "Club nuevo"
    assert ficha["metricas"]["minutos_jugados"] == 1382


def test_jug001_rn012_coincidencia_con_los_filtros_del_perfil(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session, nombre="Primera C", cobertura=Cobertura.basica)
    jugador = crear_jugador(session, fecha_nacimiento=date(2002, 6, 1), valor_mercado_eur=120_000)
    crear_estadistica(session, jugador=jugador, liga=liga, posicion=Posicion.defensor)

    coincidencia = cliente_con_sesion.get(
        f"{URL}/{jugador.id}",
        params={
            "posicion": "defensor",
            "edad_min": 20,
            "edad_max": 27,
            "presupuesto_max_eur": 150_000,
            "pases_min": 80,
        },
    ).json()["coincidencia"]

    assert (coincidencia["cumple"], coincidencia["total"]) == (3, 4)
    assert [c["estado"] for c in coincidencia["criterios"]] == [
        "cumple",
        "cumple",
        "cumple",
        "no_disponible",
    ]


def test_jug001_en_seguimiento(
    cliente_con_sesion: TestClient, session: Session, usuario_con_sesion
):
    defensor, _ = _defensor_completo(session)
    session.add(Seguimiento(usuario_id=usuario_con_sesion.id, jugador_id=defensor.id))
    session.flush()

    assert cliente_con_sesion.get(f"{URL}/{defensor.id}").json()["en_seguimiento"] is True


def test_jug001_jugador_inexistente_responde_404(cliente_con_sesion: TestClient):
    respuesta = cliente_con_sesion.get(f"{URL}/999999")

    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "jugador_inexistente"


def test_jug001_jugador_sin_estadistica_en_la_temporada_actual_responde_404(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session, temporada_actual=2026)
    jugador = crear_jugador(session)
    crear_estadistica(session, jugador=jugador, liga=liga, temporada=2024)

    assert cliente_con_sesion.get(f"{URL}/{jugador.id}").status_code == 404


def test_jug001_filtros_invalidos_responden_422(cliente_con_sesion: TestClient, session: Session):
    defensor, _ = _defensor_completo(session)

    respuesta = cliente_con_sesion.get(f"{URL}/{defensor.id}", params={"pases_min": 150})

    assert respuesta.status_code == 422
