"""AUT-001: POST /api/v1/auth/registro (RN-022, ADR-0005)."""

import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import Usuario
from app.seguridad.contrasenas import verificar_contrasena
from tests.fabricas import crear_usuario

pytestmark = pytest.mark.integracion

URL = "/api/v1/auth/registro"


def _pedido(**cambios) -> dict:
    pedido = {
        "nombre": "Javier Ledesma",
        "email": "javier@deportivonorte.com",
        "rol": "director_tecnico",
        "club": "Deportivo Norte",
        "contrasena": "una-contrasena-segura",
        "acepta_terminos": True,
    }
    return pedido | cambios


def _cantidad_de_usuarios(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(Usuario))


def test_aut001_registro_exitoso_crea_la_cuenta_y_la_sesion(cliente: TestClient, session: Session):
    respuesta = cliente.post(URL, json=_pedido())

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo == {
        "id": cuerpo["id"],
        "nombre": "Javier Ledesma",
        "email": "javier@deportivonorte.com",
        "rol": "director_tecnico",
        "club": "Deportivo Norte",
    }
    cookie = respuesta.headers["set-cookie"]
    assert cookie.startswith("sesion=")
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    assert "Max-Age=28800" in cookie

    usuario = session.get(Usuario, cuerpo["id"])
    assert verificar_contrasena("una-contrasena-segura", usuario.hash_contrasena)
    assert usuario.terminos_aceptados_en is not None


def test_aut001_la_respuesta_nunca_incluye_la_contrasena_ni_el_hash(cliente: TestClient):
    respuesta = cliente.post(URL, json=_pedido())

    assert "una-contrasena-segura" not in respuesta.text
    assert "hash" not in respuesta.text
    assert "argon2" not in respuesta.text


def test_aut001_la_contrasena_no_aparece_en_los_logs(
    cliente: TestClient, caplog: pytest.LogCaptureFixture
):
    with caplog.at_level(logging.DEBUG):
        cliente.post(URL, json=_pedido(contrasena="corta"))
        cliente.post(URL, json=_pedido())

    assert "una-contrasena-segura" not in caplog.text
    assert "corta" not in caplog.text


def test_aut001_email_ya_registrado_responde_409(cliente: TestClient, session: Session):
    crear_usuario(session, email="javier@deportivonorte.com")

    respuesta = cliente.post(URL, json=_pedido(email="Javier@DeportivoNorte.com "))

    assert respuesta.status_code == 409
    assert respuesta.json() == {
        "detalle": "Ese correo ya tiene una cuenta. Probá ingresando.",
        "codigo": "email_registrado",
    }
    assert _cantidad_de_usuarios(session) == 1
    assert "set-cookie" not in respuesta.headers


def test_aut001_contrasena_corta_responde_422_y_no_crea_la_cuenta(
    cliente: TestClient, session: Session
):
    respuesta = cliente.post(URL, json=_pedido(contrasena="12345"))

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"
    assert respuesta.json()["errores"] == [
        {"campo": "contrasena", "mensaje": "Le faltan 3 caracteres: el mínimo es 8."}
    ]
    assert _cantidad_de_usuarios(session) == 0


def test_aut001_campos_faltantes_se_marcan_cada_uno_y_no_crea_la_cuenta(
    cliente: TestClient, session: Session
):
    pedido = _pedido()
    del pedido["rol"]
    pedido["acepta_terminos"] = False

    respuesta = cliente.post(URL, json=pedido)

    assert respuesta.status_code == 422
    assert respuesta.json()["errores"] == [
        {"campo": "rol", "mensaje": "Elegí tu rol en el club."},
        {
            "campo": "acepta_terminos",
            "mensaje": "Hay que aceptar los términos y condiciones para crear la cuenta.",
        },
    ]
    assert _cantidad_de_usuarios(session) == 0


def test_aut001_se_guardan_el_email_normalizado_y_el_nombre_y_club_recortados(
    cliente: TestClient, session: Session
):
    respuesta = cliente.post(
        URL,
        json=_pedido(
            nombre="  Javier Ledesma ",
            email=" Javier@DeportivoNorte.com ",
            club=" Deportivo Norte ",
        ),
    )

    usuario = session.get(Usuario, respuesta.json()["id"])
    assert usuario.email == "javier@deportivonorte.com"
    assert usuario.nombre == "Javier Ledesma"
    assert usuario.club == "Deportivo Norte"


def test_aut001_un_cuerpo_que_no_es_json_responde_422(cliente: TestClient):
    respuesta = cliente.post(URL, content="no es json", headers={"content-type": "text/plain"})

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"
