"""Tokens firmados (JWT HS256, ADR-0005).

- Sesión: viaja en la cookie httpOnly "sesion".
- Recuperación de contraseña (AUT-003, RN-036): viaja en el link del mail. Se firma con una clave
  derivada de SECRET_KEY, así un token de un tipo nunca sirve como el otro.
"""

import hashlib
import hmac
from datetime import UTC, datetime, timedelta

import jwt

from app.config import obtener_configuracion

ALGORITMO_JWT = "HS256"
MINUTOS_TOKEN_RECUPERACION = 60  # RN-036
PROPOSITO_RECUPERACION = b"recuperacion-de-contrasena"
LARGO_HUELLA = 16


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


def huella_de_contrasena(hash_contrasena: str) -> str:
    """Resumen corto del hash actual. Cuando la contraseña cambia, la huella cambia y los links
    pedidos antes dejan de servir (RN-036: un solo uso), sin guardar nada en la base."""
    return hashlib.sha256(hash_contrasena.encode()).hexdigest()[:LARGO_HUELLA]


def _clave_recuperacion() -> str:
    secreto = obtener_configuracion().secret_key.encode()
    return hmac.new(secreto, PROPOSITO_RECUPERACION, hashlib.sha256).hexdigest()


def crear_token_recuperacion(
    usuario_id: int, hash_contrasena: str, *, ahora: datetime | None = None
) -> str:
    """Token del link para elegir una contraseña nueva. Vence a los 60 minutos (RN-036)."""
    emitido = ahora or datetime.now(UTC)
    datos = {
        "sub": str(usuario_id),
        "huella": huella_de_contrasena(hash_contrasena),
        "iat": emitido,
        "exp": emitido + timedelta(minutes=MINUTOS_TOKEN_RECUPERACION),
    }
    return jwt.encode(datos, _clave_recuperacion(), algorithm=ALGORITMO_JWT)


def leer_token_recuperacion(token: str) -> tuple[int, str] | None:
    """Devuelve (id del usuario, huella), o None si es inválido, está adulterado o venció."""
    try:
        datos = jwt.decode(
            token,
            _clave_recuperacion(),
            algorithms=[ALGORITMO_JWT],
            options={"require": ["exp", "sub", "huella"]},
        )
        return int(datos["sub"]), str(datos["huella"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
