"""Envío de mails (AUT-003). En producción va por la API HTTP de Brevo: Render gratis bloquea el
SMTP saliente (puertos 25, 465 y 587). Los tests nunca le pegan a Brevo: usan EnviadorEnMemoria.
"""

import logging
from dataclasses import dataclass, field
from typing import Protocol

import httpx

from app.config import obtener_configuracion

logger = logging.getLogger(__name__)

URL_BREVO = "https://api.brevo.com/v3/smtp/email"
NOMBRE_REMITENTE = "StatsLine"
SEGUNDOS_TIMEOUT = 10


@dataclass(frozen=True)
class Correo:
    destinatario: str
    nombre_destinatario: str
    asunto: str
    texto: str
    html: str


class ErrorCorreo(Exception):
    """El mail no se pudo mandar. El mensaje nunca lleva la clave ni el contenido."""


class EnviadorCorreo(Protocol):
    def enviar(self, correo: Correo) -> None: ...


class EnviadorBrevo:
    def __init__(
        self,
        api_key: str,
        remitente: str,
        *,
        transporte: httpx.BaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._remitente = remitente
        self._transporte = transporte

    def enviar(self, correo: Correo) -> None:
        cuerpo = {
            "sender": {"email": self._remitente, "name": NOMBRE_REMITENTE},
            "to": [{"email": correo.destinatario, "name": correo.nombre_destinatario}],
            "subject": correo.asunto,
            "textContent": correo.texto,
            "htmlContent": correo.html,
        }
        try:
            with httpx.Client(transport=self._transporte, timeout=SEGUNDOS_TIMEOUT) as cliente:
                respuesta = cliente.post(URL_BREVO, json=cuerpo, headers={"api-key": self._api_key})
        except httpx.HTTPError as error:
            raise ErrorCorreo(f"Brevo no respondió ({type(error).__name__}).") from None
        if respuesta.is_error:
            raise ErrorCorreo(f"Brevo respondió HTTP {respuesta.status_code}.")


class EnviadorEnLog:
    """Sin BREVO_API_KEY. En desarrollo escribe el mail en el log para poder probar el flujo; en
    producción solo registra que falta la clave, nunca el link."""

    def __init__(self, *, mostrar_contenido: bool) -> None:
        self._mostrar_contenido = mostrar_contenido

    def enviar(self, correo: Correo) -> None:
        if self._mostrar_contenido:
            logger.warning(
                "Mail para %s (sin BREVO_API_KEY, no se manda):\n%s",
                correo.destinatario,
                correo.texto,
            )
        else:
            logger.error('No se mandó el mail "%s": falta BREVO_API_KEY.', correo.asunto)


@dataclass
class EnviadorEnMemoria:
    """Para los tests: guarda los mails en lugar de mandarlos."""

    enviados: list[Correo] = field(default_factory=list)

    def enviar(self, correo: Correo) -> None:
        self.enviados.append(correo)


def obtener_enviador() -> EnviadorCorreo:
    """Dependencia de FastAPI: Brevo si hay clave y remitente; si no, el log."""
    configuracion = obtener_configuracion()
    if configuracion.brevo_api_key and configuracion.correo_remitente:
        return EnviadorBrevo(configuracion.brevo_api_key, configuracion.correo_remitente)
    return EnviadorEnLog(mostrar_contenido=configuracion.entorno != "produccion")


def enviar_sin_fallar(enviador: EnviadorCorreo, correo: Correo) -> None:
    """Corre después de responder (BackgroundTasks): si el mail falla, se registra y el usuario
    puede pedir otro link. El log no lleva el contenido, que tiene el link."""
    try:
        enviador.enviar(correo)
    except Exception as error:
        logger.error('No se pudo mandar el mail "%s": %s', correo.asunto, error)
