"""AUT-003: envío del mail por la API HTTP de Brevo. Nunca se le pega a Brevo real."""

import json
import logging

import httpx
import pytest
from app.integraciones.cliente_correo import (
    Correo,
    EnviadorBrevo,
    EnviadorEnLog,
    ErrorCorreo,
    enviar_sin_fallar,
)

CLAVE = "xkeysib-clave-de-prueba"
CORREO = Correo(
    destinatario="javier@club.com",
    nombre_destinatario="Javier Ledesma",
    asunto="Elegí una contraseña nueva",
    texto="Entrá a https://app/restablecer?token=abc",
    html="<p>Entrá</p>",
)


def _brevo(respuesta: httpx.Response, pedidos: list[httpx.Request]) -> EnviadorBrevo:
    def atender(pedido: httpx.Request) -> httpx.Response:
        pedidos.append(pedido)
        return respuesta

    return EnviadorBrevo(CLAVE, "statsline@club.com", transporte=httpx.MockTransport(atender))


def test_aut003_brevo_recibe_remitente_destinatario_y_contenido():
    pedidos: list[httpx.Request] = []

    _brevo(httpx.Response(201, json={"messageId": "1"}), pedidos).enviar(CORREO)

    (pedido,) = pedidos
    assert pedido.method == "POST"
    assert str(pedido.url) == "https://api.brevo.com/v3/smtp/email"
    assert pedido.headers["api-key"] == CLAVE
    assert json.loads(pedido.content) == {
        "sender": {"email": "statsline@club.com", "name": "StatsLine"},
        "to": [{"email": "javier@club.com", "name": "Javier Ledesma"}],
        "subject": "Elegí una contraseña nueva",
        "textContent": "Entrá a https://app/restablecer?token=abc",
        "htmlContent": "<p>Entrá</p>",
    }


def test_aut003_si_brevo_responde_error_se_lanza_sin_la_clave():
    with pytest.raises(ErrorCorreo) as error:
        _brevo(httpx.Response(401, json={"message": "Key not found"}), []).enviar(CORREO)

    assert "401" in str(error.value)
    assert CLAVE not in str(error.value)


def test_aut003_enviar_sin_fallar_registra_el_error_sin_el_link(caplog):
    caplog.set_level(logging.ERROR)

    enviar_sin_fallar(_brevo(httpx.Response(500), []), CORREO)

    assert "No se pudo mandar" in caplog.text
    assert "token=abc" not in caplog.text


def test_aut003_sin_clave_en_desarrollo_el_mail_se_escribe_en_el_log(caplog):
    caplog.set_level(logging.WARNING)

    EnviadorEnLog(mostrar_contenido=True).enviar(CORREO)

    assert "token=abc" in caplog.text


def test_aut003_sin_clave_en_produccion_no_se_escribe_el_link(caplog):
    caplog.set_level(logging.WARNING)

    EnviadorEnLog(mostrar_contenido=False).enviar(CORREO)

    assert "BREVO_API_KEY" in caplog.text
    assert "token=abc" not in caplog.text
