"""Registro e ingreso de usuarios (RN-022). Los mensajes son los del prototipo v1."""

import re
from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errores import ErrorApi, ErrorValidacion
from app.esquemas.auth import PedidoRegistro
from app.modelos import Usuario
from app.modelos.base import ahora_utc
from app.modelos.enums import Rol
from app.repositorios import usuario as repositorio_usuario
from app.seguridad.contrasenas import hashear_contrasena

LARGO_MINIMO_CONTRASENA = 8
PATRON_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
ROLES_VALIDOS = {rol.value for rol in Rol}

MENSAJE_EMAIL_REGISTRADO = "Ese correo ya tiene una cuenta. Probá ingresando."


@dataclass(frozen=True)
class ErrorCampo:
    campo: str
    mensaje: str


def normalizar_email(email: str) -> str:
    """RN-022: el email se guarda recortado y en minúsculas."""
    return email.strip().lower()


def _recortar(texto: str | None) -> str:
    return (texto or "").strip()


def _error_contrasena(contrasena: str) -> str | None:
    if not contrasena:
        return "Elegí una contraseña."
    if len(contrasena) < LARGO_MINIMO_CONTRASENA:
        faltan = LARGO_MINIMO_CONTRASENA - len(contrasena)
        return f"Le faltan {faltan} caracteres: el mínimo es {LARGO_MINIMO_CONTRASENA}."
    return None


def _error_email(email: str) -> str | None:
    if not email:
        return "Completá tu correo electrónico."
    if not PATRON_EMAIL.match(email):
        return "Ese correo no parece válido."
    return None


def validar_registro(datos: PedidoRegistro) -> list[ErrorCampo]:
    """RN-022: todos los campos son obligatorios. Devuelve un error por campo, en orden."""
    errores = {
        "nombre": None if _recortar(datos.nombre) else "Completá tu nombre y apellido.",
        "email": _error_email(normalizar_email(datos.email or "")),
        "rol": None if datos.rol in ROLES_VALIDOS else "Elegí tu rol en el club.",
        "club": None if _recortar(datos.club) else "Completá el nombre de tu club.",
        "contrasena": _error_contrasena(datos.contrasena or ""),
        "acepta_terminos": None
        if datos.acepta_terminos
        else "Hay que aceptar los términos y condiciones para crear la cuenta.",
    }
    return [ErrorCampo(campo, mensaje) for campo, mensaje in errores.items() if mensaje]


def registrar(session: Session, datos: PedidoRegistro) -> Usuario:
    """AUT-001: crea la cuenta. 422 si hay datos inválidos y 409 si el email ya está registrado."""
    errores = validar_registro(datos)
    if errores:
        raise ErrorValidacion([{"campo": e.campo, "mensaje": e.mensaje} for e in errores])

    email = normalizar_email(datos.email or "")
    if repositorio_usuario.obtener_por_email(session, email) is not None:
        raise ErrorApi(409, "email_registrado", MENSAJE_EMAIL_REGISTRADO)

    usuario = Usuario(
        nombre=_recortar(datos.nombre),
        email=email,
        hash_contrasena=hashear_contrasena(datos.contrasena or ""),
        rol=Rol(datos.rol),
        club=_recortar(datos.club),
        terminos_aceptados_en=ahora_utc(),
    )
    try:
        repositorio_usuario.agregar(session, usuario)
        session.commit()
    except IntegrityError as error:
        # Dos registros simultáneos con el mismo email: gana el primero
        session.rollback()
        raise ErrorApi(409, "email_registrado", MENSAJE_EMAIL_REGISTRADO) from error
    return usuario
