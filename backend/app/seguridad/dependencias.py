"""Dependencia usuario_actual: la usan todos los endpoints 🔒 (ENGINEERING_STANDARDS.md §2)."""

from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.errores import ErrorApi
from app.modelos import Usuario
from app.repositorios import usuario as repositorio_usuario
from app.seguridad.tokens import leer_token_sesion

NOMBRE_COOKIE_SESION = "sesion"
MENSAJE_SIN_SESION = "Necesitás iniciar sesión para entrar a esa pantalla."


def usuario_actual(
    session: Annotated[Session, Depends(obtener_session)],
    token: Annotated[str | None, Cookie(alias=NOMBRE_COOKIE_SESION)] = None,
) -> Usuario:
    """Devuelve el usuario de la cookie de sesión o responde 401 sin_sesion (RN-022).

    Responde 401 si no hay cookie, si el token es inválido o venció, o si el usuario ya no existe.
    """
    usuario_id = leer_token_sesion(token) if token else None
    usuario = repositorio_usuario.obtener_por_id(session, usuario_id) if usuario_id else None
    if usuario is None:
        raise ErrorApi(401, "sin_sesion", MENSAJE_SIN_SESION)
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]
