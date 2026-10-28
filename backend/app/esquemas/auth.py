from pydantic import BaseModel

from app.modelos.enums import Rol


class PedidoRegistro(BaseModel):
    """Lo que manda el formulario de registro.

    Todo es opcional acá a propósito: la validación con los mensajes de RN-022 la hace
    servicios/auth.py, para devolver un mensaje en español por cada campo.
    """

    nombre: str | None = None
    email: str | None = None
    rol: str | None = None
    club: str | None = None
    contrasena: str | None = None
    acepta_terminos: bool = False


class RespuestaUsuario(BaseModel):
    """`Usuario` del contrato: nunca incluye el hash de la contraseña."""

    id: int
    nombre: str
    email: str
    rol: Rol
    club: str
