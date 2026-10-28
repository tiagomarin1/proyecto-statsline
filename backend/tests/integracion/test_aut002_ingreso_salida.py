"""AUT-002: ingreso, salida y /auth/yo (RN-022, ADR-0005)."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.seguridad.dependencias import NOMBRE_COOKIE_SESION
from app.seguridad.tokens import crear_token_sesion
from tests.fabricas import CONTRASENA_DE_PRUEBA, crear_usuario

pytestmark = pytest.mark.integracion

INGRESO = "/api/v1/auth/ingreso"
SALIDA = "/api/v1/auth/salida"
YO = "/api/v1/auth/yo"

CREDENCIALES_INVALIDAS = {
    "detalle": "Correo o contraseña incorrectos.",
    "codigo": "credenciales_invalidas",
}
SIN_SESION = {
    "detalle": "Necesitás iniciar sesión para entrar a esa pantalla.",
    "codigo": "sin_sesion",
}


@pytest.fixture
def javier(session: Session):
    return crear_usuario(session, email="javier@deportivonorte.com", nombre="Javier Ledesma")


def _ingresar(cliente: TestClient, email: str, contrasena: str = CONTRASENA_DE_PRUEBA):
    return cliente.post(INGRESO, json={"email": email, "contrasena": contrasena})


def test_aut002_ingreso_correcto_devuelve_el_usuario_y_la_cookie(cliente: TestClient, javier):
    respuesta = _ingresar(cliente, "javier@deportivonorte.com")

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "id": javier.id,
        "nombre": "Javier Ledesma",
        "email": "javier@deportivonorte.com",
        "rol": "director_tecnico",
        "club": "Deportivo Norte",
    }
    cookie = respuesta.headers["set-cookie"]
    assert cookie.startswith(f"{NOMBRE_COOKIE_SESION}=")
    assert "HttpOnly" in cookie
    assert "Max-Age=28800" in cookie


def test_aut002_el_email_del_ingreso_se_normaliza(cliente: TestClient, javier):
    respuesta = _ingresar(cliente, "  Javier@DeportivoNorte.com ")

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == javier.id


def test_aut002_email_inexistente_responde_401_generico(cliente: TestClient, javier):
    respuesta = _ingresar(cliente, "nadie@club.com")

    assert respuesta.status_code == 401
    assert respuesta.json() == CREDENCIALES_INVALIDAS
    assert "set-cookie" not in respuesta.headers


def test_aut002_contrasena_incorrecta_responde_el_mismo_401(cliente: TestClient, javier):
    respuesta = _ingresar(cliente, "javier@deportivonorte.com", "otra-contrasena")

    assert respuesta.status_code == 401
    assert respuesta.json() == CREDENCIALES_INVALIDAS
    assert "set-cookie" not in respuesta.headers


def test_aut002_campos_vacios_responden_el_mismo_401(cliente: TestClient, javier):
    respuesta = cliente.post(INGRESO, json={})

    assert respuesta.status_code == 401
    assert respuesta.json() == CREDENCIALES_INVALIDAS


def test_aut002_yo_con_sesion_devuelve_el_usuario(cliente: TestClient, javier):
    _ingresar(cliente, "javier@deportivonorte.com")

    respuesta = cliente.get(YO)

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "javier@deportivonorte.com"
    assert "hash_contrasena" not in respuesta.json()


def test_aut002_yo_sin_sesion_responde_401(cliente: TestClient):
    respuesta = cliente.get(YO)

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION


def test_aut002_sesion_de_mas_de_8_horas_responde_401(cliente: TestClient, javier):
    hace_9_horas = datetime.now(UTC) - timedelta(hours=9)
    cliente.cookies.set(NOMBRE_COOKIE_SESION, crear_token_sesion(javier.id, ahora=hace_9_horas))

    respuesta = cliente.get(YO)

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION


def test_aut002_cerrar_sesion_borra_la_cookie(cliente: TestClient, javier):
    _ingresar(cliente, "javier@deportivonorte.com")

    respuesta = cliente.post(SALIDA)

    assert respuesta.status_code == 204
    cookie = respuesta.headers["set-cookie"]
    assert cookie.startswith(f"{NOMBRE_COOKIE_SESION}=")
    assert "Max-Age=0" in cookie
    assert cliente.get(YO).status_code == 401


def test_aut002_cerrar_sesion_sin_sesion_responde_401(cliente: TestClient):
    respuesta = cliente.post(SALIDA)

    assert respuesta.status_code == 401
    assert respuesta.json() == SIN_SESION


def test_aut002_registrarse_deja_la_sesion_iniciada(cliente: TestClient):
    cliente.post(
        "/api/v1/auth/registro",
        json={
            "nombre": "Ricardo Molina",
            "email": "ricardo@club.com",
            "rol": "director_deportivo",
            "club": "Club Rosario",
            "contrasena": "una-contrasena-segura",
            "acepta_terminos": True,
        },
    )

    assert cliente.get(YO).json()["nombre"] == "Ricardo Molina"
