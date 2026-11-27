"""JUG-004: todas las respuestas con jugadores traen nombre_completo (RN-038)."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos import Seguimiento
from app.modelos.enums import Posicion
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_estadistica, crear_jugador

pytestmark = pytest.mark.integracion


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: date(2026, 10, 27)


def _jugador(session: Session, nombre: str, nombre_pila: str | None, apellido: str | None):
    jugador = crear_jugador(session, nombre=nombre, nombre_pila=nombre_pila, apellido=apellido)
    crear_estadistica(session, jugador=jugador, posicion=Posicion.defensor, minutos_jugados=900)
    return jugador


def test_jug004_busqueda_trae_el_nombre_completo(cliente_con_sesion: TestClient, session: Session):
    magallan = _jugador(session, "L. Magallán", "Lisandro", "Magallán")
    rojo = _jugador(session, "M. Rojo", None, "Rojo")

    respuesta = cliente_con_sesion.get("/api/v1/jugadores", params={"tamano": 50})

    assert respuesta.status_code == 200
    por_id = {fila["id"]: fila for fila in respuesta.json()["resultados"]}
    assert por_id[magallan.id]["nombre"] == "L. Magallán"
    assert por_id[magallan.id]["nombre_completo"] == "Lisandro Magallán"
    assert por_id[rojo.id]["nombre_completo"] == "Rojo"


def test_jug004_busqueda_por_nombre_no_cambia(cliente_con_sesion: TestClient, session: Session):
    magallan = _jugador(session, "L. Magallán", "Lisandro", "Magallán")

    for texto in ("Lisandro", "Magallan", "L. Magallán"):
        respuesta = cliente_con_sesion.get("/api/v1/jugadores", params={"nombre": texto})
        assert [fila["id"] for fila in respuesta.json()["resultados"]] == [magallan.id]


def test_jug004_ficha_trae_el_nombre_completo(cliente_con_sesion: TestClient, session: Session):
    jugador = _jugador(session, "Ander Herrera", None, None)

    respuesta = cliente_con_sesion.get(f"/api/v1/jugadores/{jugador.id}")

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Ander Herrera"
    assert respuesta.json()["nombre_completo"] == "Ander Herrera"


def test_jug004_comparacion_trae_el_nombre_completo(
    cliente_con_sesion: TestClient, session: Session
):
    arias = _jugador(session, "S. Arias", "Santiago", "Arias Naranjo")
    rojo = _jugador(session, "M. Rojo", "Faustino Marcos Alberto", "Rojo")

    respuesta = cliente_con_sesion.post(
        "/api/v1/comparaciones", json={"jugador_ids": [arias.id, rojo.id]}
    )

    assert respuesta.status_code == 200
    assert [j["nombre_completo"] for j in respuesta.json()["jugadores"]] == [
        "Santiago Arias Naranjo",
        "Faustino Marcos Alberto Rojo",
    ]
    assert [j["nombre"] for j in respuesta.json()["jugadores"]] == ["S. Arias", "M. Rojo"]


def test_jug004_seguimiento_trae_el_nombre_completo_y_lo_usa_en_el_aviso(
    cliente_con_sesion: TestClient, session: Session, usuario_con_sesion
):
    rojo = _jugador(session, "M. Rojo", "Faustino Marcos Alberto", "Rojo")
    otro = _jugador(session, "J. Pérez", None, None)
    session.add(Seguimiento(usuario_id=usuario_con_sesion.id, jugador_id=otro.id))
    session.flush()

    guardado = cliente_con_sesion.post("/api/v1/seguimiento", json={"jugador_id": rojo.id})
    lista = cliente_con_sesion.get("/api/v1/seguimiento")

    assert guardado.json()["aviso"] == (
        "Faustino Marcos Alberto Rojo quedó guardado en la lista de seguimiento."
    )
    nombres = {fila["id"]: fila["nombre_completo"] for fila in lista.json()}
    assert nombres == {rojo.id: "Faustino Marcos Alberto Rojo", otro.id: "J. Pérez"}
