"""SEG-001: GET, POST y DELETE /api/v1/seguimiento (RN-026)."""

from datetime import date, datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import Seguimiento
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_estadistica, crear_jugador, crear_usuario

pytestmark = pytest.mark.integracion

URL = "/api/v1/seguimiento"
HOY = date(2026, 10, 27)


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: HOY


def _jugador(session: Session, nombre: str):
    jugador = crear_jugador(session, nombre=nombre)
    crear_estadistica(session, jugador=jugador, minutos_jugados=900)
    return jugador


def _guardar(session: Session, usuario, jugador, creado_en: datetime) -> None:
    session.add(Seguimiento(usuario_id=usuario.id, jugador_id=jugador.id, creado_en=creado_en))
    session.flush()


def _cantidad_guardados(session: Session, usuario) -> int:
    return session.scalar(
        select(func.count()).select_from(Seguimiento).where(Seguimiento.usuario_id == usuario.id)
    )


def test_seg001_sin_sesion_responde_401(cliente: TestClient):
    assert cliente.get(URL).status_code == 401
    assert cliente.post(URL, json={"jugador_id": 1}).status_code == 401
    assert cliente.delete(f"{URL}/1").status_code == 401


def test_seg001_guardar(cliente_con_sesion: TestClient, session: Session, usuario_con_sesion):
    jugador = _jugador(session, "Nahuel Ferreyra")

    respuesta = cliente_con_sesion.post(URL, json={"jugador_id": jugador.id})

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "jugador_id": jugador.id,
        "aviso": "Nahuel Ferreyra quedó guardado en la lista de seguimiento.",
    }
    assert _cantidad_guardados(session, usuario_con_sesion) == 1


def test_seg001_guardar_dos_veces_responde_200_sin_duplicar(
    cliente_con_sesion: TestClient, session: Session, usuario_con_sesion
):
    jugador = _jugador(session, "Nahuel Ferreyra")
    cliente_con_sesion.post(URL, json={"jugador_id": jugador.id})

    respuesta = cliente_con_sesion.post(URL, json={"jugador_id": jugador.id})

    assert respuesta.status_code == 200
    assert _cantidad_guardados(session, usuario_con_sesion) == 1


def test_seg001_guardar_un_jugador_inexistente_responde_404(cliente_con_sesion: TestClient):
    respuesta = cliente_con_sesion.post(URL, json={"jugador_id": 999_999})

    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "jugador_inexistente"


def test_seg001_guardar_sin_jugador_responde_422(cliente_con_sesion: TestClient):
    assert cliente_con_sesion.post(URL, json={}).status_code == 422


def test_seg001_ver_la_lista_del_mas_reciente_al_mas_viejo(
    cliente_con_sesion: TestClient, session: Session, usuario_con_sesion
):
    viejo = _jugador(session, "Guardado primero")
    nuevo = _jugador(session, "Guardado último")
    medio = _jugador(session, "Guardado en el medio")
    _guardar(session, usuario_con_sesion, viejo, datetime(2026, 10, 1, 10, 0))
    _guardar(session, usuario_con_sesion, nuevo, datetime(2026, 10, 3, 10, 0))
    _guardar(session, usuario_con_sesion, medio, datetime(2026, 10, 2, 10, 0))

    respuesta = cliente_con_sesion.get(URL)

    assert respuesta.status_code == 200
    lista = respuesta.json()
    assert [j["nombre"] for j in lista] == [
        "Guardado último",
        "Guardado en el medio",
        "Guardado primero",
    ]
    assert all(j["en_seguimiento"] for j in lista)
    assert lista[0]["minutos_jugados"] == 900


def test_seg001_cada_usuario_ve_solo_su_lista(
    cliente_con_sesion: TestClient, session: Session, usuario_con_sesion
):
    mio = _jugador(session, "Mío")
    ajeno = _jugador(session, "De otro usuario")
    _guardar(session, usuario_con_sesion, mio, datetime(2026, 10, 1))
    _guardar(session, crear_usuario(session), ajeno, datetime(2026, 10, 2))

    assert [j["nombre"] for j in cliente_con_sesion.get(URL).json()] == ["Mío"]


def test_seg001_lista_vacia(cliente_con_sesion: TestClient):
    assert cliente_con_sesion.get(URL).json() == []


def test_seg001_quitar(cliente_con_sesion: TestClient, session: Session, usuario_con_sesion):
    jugador = _jugador(session, "Nahuel Ferreyra")
    _guardar(session, usuario_con_sesion, jugador, datetime(2026, 10, 1))

    respuesta = cliente_con_sesion.delete(f"{URL}/{jugador.id}")

    assert respuesta.status_code == 204
    assert cliente_con_sesion.get(URL).json() == []


def test_seg001_quitar_uno_que_no_esta_responde_204(cliente_con_sesion: TestClient):
    assert cliente_con_sesion.delete(f"{URL}/999999").status_code == 204


def test_seg001_quitar_no_toca_la_lista_de_otro_usuario(
    cliente_con_sesion: TestClient, session: Session
):
    otro = crear_usuario(session)
    jugador = _jugador(session, "Nahuel Ferreyra")
    _guardar(session, otro, jugador, datetime(2026, 10, 1))

    cliente_con_sesion.delete(f"{URL}/{jugador.id}")

    assert _cantidad_guardados(session, otro) == 1
