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


class PedidoIngreso(BaseModel):
    """Email y contraseña. Si falta alguno, el ingreso responde el mismo 401 genérico."""

    email: str | None = None
    contrasena: str | None = None


class PedidoRecuperacion(BaseModel):
    """AUT-003: el correo de la cuenta. Si falta, se responde igual (RN-036)."""

    email: str | None = None


class PedidoRestablecer(BaseModel):
    """AUT-003: el token del link y la contraseña nueva (RN-022)."""

    token: str | None = None
    contrasena: str | None = None


class RespuestaDetalle(BaseModel):
    detalle: str


class RespuestaUsuario(BaseModel):
    """`Usuario` del contrato: nunca incluye el hash de la contraseña."""

    id: int
    nombre: str
    email: str
    rol: Rol
    club: str
