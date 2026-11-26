from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_session
from app.esquemas.auth import (
    PedidoIngreso,
    PedidoRecuperacion,
    PedidoRegistro,
    PedidoRestablecer,
    RespuestaDetalle,
    RespuestaUsuario,
)
from app.integraciones.cliente_correo import EnviadorCorreo, enviar_sin_fallar, obtener_enviador
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


@router.post("/recuperacion", status_code=status.HTTP_202_ACCEPTED, response_model=RespuestaDetalle)
def pedir_recuperacion(
    datos: PedidoRecuperacion,
    session: SessionDb,
    tareas: BackgroundTasks,
    enviador: Annotated[EnviadorCorreo, Depends(obtener_enviador)],
) -> RespuestaDetalle:
    """AUT-003: manda el link para elegir una contraseña nueva. Responde lo mismo tenga cuenta o
    no, y el mail sale después de responder, así el tiempo tampoco lo delata (RN-036)."""
    correo = servicio_auth.armar_correo_de_recuperacion(
        session, datos.email, obtener_configuracion().url_publica
    )
    if correo is not None:
        tareas.add_task(enviar_sin_fallar, enviador, correo)
    return RespuestaDetalle(detalle=servicio_auth.MENSAJE_RECUPERACION_PEDIDA)


@router.post("/recuperacion/confirmar", response_model=RespuestaUsuario)
def confirmar_recuperacion(
    datos: PedidoRestablecer, response: Response, session: SessionDb
) -> RespuestaUsuario:
    """AUT-003: cambia la contraseña con el token del link y deja la sesión iniciada."""
    usuario = servicio_auth.restablecer_contrasena(session, datos.token, datos.contrasena)
    escribir_cookie_sesion(response, usuario.id)
    return RespuestaUsuario.model_validate(usuario, from_attributes=True)
