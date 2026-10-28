from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.auth import PedidoIngreso, PedidoRegistro, RespuestaUsuario
from app.seguridad.dependencias import UsuarioActual
from app.seguridad.sesion import borrar_cookie_sesion, escribir_cookie_sesion
from app.servicios import auth as servicio_auth

router = APIRouter(prefix="/auth", tags=["autenticación"])

SessionDb = Annotated[Session, Depends(obtener_session)]


@router.post("/registro", status_code=status.HTTP_201_CREATED, response_model=RespuestaUsuario)
def registrarse(datos: PedidoRegistro, response: Response, session: SessionDb) -> RespuestaUsuario:
    """AUT-001: crea la cuenta y deja la sesión iniciada."""
    usuario = servicio_auth.registrar(session, datos)
    escribir_cookie_sesion(response, usuario.id)
    return RespuestaUsuario.model_validate(usuario, from_attributes=True)


@router.post("/ingreso", response_model=RespuestaUsuario)
def ingresar(datos: PedidoIngreso, response: Response, session: SessionDb) -> RespuestaUsuario:
    """AUT-002: inicia la sesión. 401 credenciales_invalidas si email o contraseña no coinciden."""
    usuario = servicio_auth.ingresar(session, datos.email, datos.contrasena)
    escribir_cookie_sesion(response, usuario.id)
    return RespuestaUsuario.model_validate(usuario, from_attributes=True)


@router.post("/salida", status_code=status.HTTP_204_NO_CONTENT)
def salir(_: UsuarioActual, response: Response) -> Response:
    """AUT-002: cierra la sesión borrando la cookie."""
    response.status_code = status.HTTP_204_NO_CONTENT
    borrar_cookie_sesion(response)
    return response


@router.get("/yo", response_model=RespuestaUsuario)
def obtener_usuario_actual(usuario: UsuarioActual) -> RespuestaUsuario:
    """AUT-002: el usuario de la sesión (nombre, rol y club para el menú de la cuenta)."""
    return RespuestaUsuario.model_validate(usuario, from_attributes=True)
