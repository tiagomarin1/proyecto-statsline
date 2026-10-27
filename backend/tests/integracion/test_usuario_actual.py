"""INF-001: la dependencia usuario_actual protege los endpoints 🔒 (ADR-0005, RN-022)."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.seguridad.dependencias import NOMBRE_COOKIE_SESION, UsuarioActual
from app.seguridad.tokens import crear_token_sesion
from tests.fabricas import crear_usuario

pytestmark = pytest.mark.integracion

SIN_SESION = {
    "detalle": "Necesitás iniciar sesión para entrar a esa pantalla.",
    "codigo": "sin_sesion",
}


@pytest.fixture
def cliente_privado(app_test: FastAPI) -> TestClient:
    """Agrega un endpoint 🔒 de prueba a la app."""

    @app_test.get("/api/v1/privado")
    def privado(usuario: UsuarioActual) -> dict:
        return {"id": usuario.id, "email": usuario.email}

    return TestClient(app_test)


def test_inf001_con_sesion_valida_devuelve_el_usuario(
    cliente_privado: TestClient, session: Session
):
    usuario = crear_usuario(session, email="javier@deportivonorte.com")
    cliente_privado.cookies.set(NOMBRE_COOKIE_SESION, crear_token_sesion(usuario.id))

    respuesta = cliente_privado.get("/api/v1/privado")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": usuario.id, "email": "javier@deportivonorte.com"}


def test_inf001_sin_cookie_responde_401_sin_sesion(cliente_privado: TestClient):
    respuesta = cliente_privado.get("/api/v1/privado")

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION


def test_inf001_con_token_invalido_responde_401(cliente_privado: TestClient):
    cliente_privado.cookies.set(NOMBRE_COOKIE_SESION, "token-adulterado")

    respuesta = cliente_privado.get("/api/v1/privado")

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION


def test_inf001_con_sesion_de_mas_de_8_horas_responde_401(
    cliente_privado: TestClient, session: Session
):
    usuario = crear_usuario(session)
    hace_9_horas = datetime.now(UTC) - timedelta(hours=9)
    cliente_privado.cookies.set(
        NOMBRE_COOKIE_SESION, crear_token_sesion(usuario.id, ahora=hace_9_horas)
    )

    respuesta = cliente_privado.get("/api/v1/privado")

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION


def test_inf001_si_el_usuario_ya_no_existe_responde_401(cliente_privado: TestClient):
    cliente_privado.cookies.set(NOMBRE_COOKIE_SESION, crear_token_sesion(999_999))

    respuesta = cliente_privado.get("/api/v1/privado")

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION
