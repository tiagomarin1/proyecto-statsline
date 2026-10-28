"""Cookie de sesión (ADR-0005): httpOnly, SameSite=Lax y Secure en producción."""

from fastapi import Response

from app.config import obtener_configuracion
from app.seguridad.dependencias import NOMBRE_COOKIE_SESION
from app.seguridad.tokens import crear_token_sesion

SEGUNDOS_POR_HORA = 3600


def escribir_cookie_sesion(response: Response, usuario_id: int) -> None:
    configuracion = obtener_configuracion()
    response.set_cookie(
        key=NOMBRE_COOKIE_SESION,
        value=crear_token_sesion(usuario_id),
        max_age=configuracion.sesion_horas * SEGUNDOS_POR_HORA,
        httponly=True,
        secure=configuracion.entorno == "produccion",
        samesite="lax",
        path="/",
    )


def borrar_cookie_sesion(response: Response) -> None:
    configuracion = obtener_configuracion()
    response.delete_cookie(
        key=NOMBRE_COOKIE_SESION,
        httponly=True,
        secure=configuracion.entorno == "produccion",
        samesite="lax",
        path="/",
    )
