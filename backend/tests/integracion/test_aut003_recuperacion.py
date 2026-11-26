"""AUT-003: recuperar la contraseña por mail (RN-022, RN-036)."""

import re
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.integraciones.cliente_correo import Correo, EnviadorEnMemoria, obtener_enviador
from app.seguridad.dependencias import NOMBRE_COOKIE_SESION
from app.seguridad.tokens import crear_token_recuperacion
from tests.fabricas import CONTRASENA_DE_PRUEBA, crear_usuario

pytestmark = pytest.mark.integracion

PEDIR = "/api/v1/auth/recuperacion"
CONFIRMAR = "/api/v1/auth/recuperacion/confirmar"
INGRESO = "/api/v1/auth/ingreso"
EMAIL = "javier@deportivonorte.com"
NUEVA = "contrasena-nueva-123"

RESPUESTA_PEDIDO = {
    "detalle": (
        "Si el correo tiene una cuenta, te mandamos un link para elegir una contraseña nueva."
    )
}
TOKEN_INVALIDO = {
    "detalle": "El link no es válido o ya venció. Pedí uno nuevo.",
    "codigo": "token_invalido",
}


class EnviadorQueFalla:
    def enviar(self, correo: Correo) -> None:
        raise RuntimeError("Brevo caído")


@pytest.fixture
def correos(app_test: FastAPI) -> EnviadorEnMemoria:
    enviador = EnviadorEnMemoria()
    app_test.dependency_overrides[obtener_enviador] = lambda: enviador
    return enviador


@pytest.fixture
def javier(session: Session):
    return crear_usuario(session, email=EMAIL, nombre="Javier Ledesma")


def _token_del_mail(correo: Correo) -> str:
    return re.search(r"/restablecer\?token=([\w.-]+)", correo.texto).group(1)


def _pedir_y_leer_token(cliente: TestClient, correos: EnviadorEnMemoria) -> str:
    cliente.post(PEDIR, json={"email": EMAIL})
    return _token_del_mail(correos.enviados[-1])


def test_aut003_pedir_el_link_manda_un_mail_con_el_link_a_restablecer(
    cliente: TestClient, correos: EnviadorEnMemoria, javier
):
    respuesta = cliente.post(PEDIR, json={"email": EMAIL})

    assert respuesta.status_code == 202
    assert respuesta.json() == RESPUESTA_PEDIDO
    (correo,) = correos.enviados
    assert correo.destinatario == EMAIL
    assert correo.nombre_destinatario == "Javier Ledesma"
    link = f"{obtener_configuracion().url_publica}/restablecer?token="
    assert link in correo.texto
    assert link in correo.html
    assert "60 minutos" in correo.texto


def test_aut003_rn036_un_correo_sin_cuenta_recibe_la_misma_respuesta_y_ningun_mail(
    cliente: TestClient, correos: EnviadorEnMemoria, javier
):
    respuesta = cliente.post(PEDIR, json={"email": "nadie@club.com"})

    assert respuesta.status_code == 202
    assert respuesta.json() == RESPUESTA_PEDIDO
    assert correos.enviados == []


def test_aut003_el_email_se_normaliza_como_en_el_registro(
    cliente: TestClient, correos: EnviadorEnMemoria, javier
):
    cliente.post(PEDIR, json={"email": "  Javier@DeportivoNorte.com "})

    assert [c.destinatario for c in correos.enviados] == [EMAIL]


def test_aut003_si_el_mail_falla_la_respuesta_no_cambia(
    app_test: FastAPI, cliente: TestClient, javier
):
    app_test.dependency_overrides[obtener_enviador] = EnviadorQueFalla

    respuesta = cliente.post(PEDIR, json={"email": EMAIL})

    assert respuesta.status_code == 202
    assert respuesta.json() == RESPUESTA_PEDIDO


def test_aut003_con_el_link_se_elige_una_contrasena_nueva_y_queda_la_sesion_iniciada(
    cliente: TestClient, correos: EnviadorEnMemoria, javier
):
    token = _pedir_y_leer_token(cliente, correos)

    respuesta = cliente.post(CONFIRMAR, json={"token": token, "contrasena": NUEVA})

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == EMAIL
    assert NOMBRE_COOKIE_SESION in respuesta.cookies
    assert cliente.post(INGRESO, json={"email": EMAIL, "contrasena": NUEVA}).status_code == 200
    vieja = cliente.post(INGRESO, json={"email": EMAIL, "contrasena": CONTRASENA_DE_PRUEBA})
    assert vieja.status_code == 401


def test_aut003_rn036_el_link_es_de_un_solo_uso(
    cliente: TestClient, correos: EnviadorEnMemoria, javier
):
    primero = _pedir_y_leer_token(cliente, correos)
    segundo = _pedir_y_leer_token(cliente, correos)
    cliente.post(CONFIRMAR, json={"token": segundo, "contrasena": NUEVA})

    for token in (segundo, primero):
        respuesta = cliente.post(CONFIRMAR, json={"token": token, "contrasena": "otra-mas-123"})
        assert respuesta.status_code == 400
        assert respuesta.json() == TOKEN_INVALIDO


def test_aut003_rn036_un_link_vencido_no_sirve(cliente: TestClient, javier):
    emitido = datetime.now(UTC) - timedelta(minutes=61)
    token = crear_token_recuperacion(javier.id, javier.hash_contrasena, ahora=emitido)

    respuesta = cliente.post(CONFIRMAR, json={"token": token, "contrasena": NUEVA})

    assert respuesta.status_code == 400
    assert respuesta.json() == TOKEN_INVALIDO


@pytest.mark.parametrize("token", ["basura", "", None])
def test_aut003_un_token_invalido_o_vacio_responde_400(cliente: TestClient, token):
    respuesta = cliente.post(CONFIRMAR, json={"token": token, "contrasena": NUEVA})

    assert respuesta.status_code == 400
    assert respuesta.json() == TOKEN_INVALIDO


def test_aut003_rn022_la_contrasena_nueva_tiene_que_tener_8_caracteres(
    cliente: TestClient, correos: EnviadorEnMemoria, javier
):
    token = _pedir_y_leer_token(cliente, correos)

    respuesta = cliente.post(CONFIRMAR, json={"token": token, "contrasena": "corta"})

    assert respuesta.status_code == 422
    assert respuesta.json()["errores"] == [
        {"campo": "contrasena", "mensaje": "Le faltan 3 caracteres: el mínimo es 8."}
    ]
    # El link sigue sirviendo: la contraseña no cambió
    ok = cliente.post(CONFIRMAR, json={"token": token, "contrasena": NUEVA})
    assert ok.status_code == 200
