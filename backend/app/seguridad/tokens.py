"""Token de sesión: JWT firmado que viaja en la cookie httpOnly "sesion" (ADR-0005)."""

from datetime import UTC, datetime, timedelta

import jwt

from app.config import obtener_configuracion

ALGORITMO_JWT = "HS256"


def crear_token_sesion(usuario_id: int, *, ahora: datetime | None = None) -> str:
    """Crea un token que vence a las SESION_HORAS horas (8 por defecto, supuesto de ADR-0005)."""
    configuracion = obtener_configuracion()
    emitido = ahora or datetime.now(UTC)
    datos = {
        "sub": str(usuario_id),
        "iat": emitido,
        "exp": emitido + timedelta(hours=configuracion.sesion_horas),
    }
    return jwt.encode(datos, configuracion.secret_key, algorithm=ALGORITMO_JWT)


def leer_token_sesion(token: str) -> int | None:
    """Devuelve el id del usuario, o None si el token es inválido, está adulterado o venció."""
    try:
        datos = jwt.decode(
            token,
            obtener_configuracion().secret_key,
            algorithms=[ALGORITMO_JWT],
            options={"require": ["exp", "sub"]},
        )
        return int(datos["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
