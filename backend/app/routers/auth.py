from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.auth import PedidoRegistro, RespuestaUsuario
from app.seguridad.sesion import escribir_cookie_sesion
from app.servicios import auth as servicio_auth

router = APIRouter(prefix="/auth", tags=["autenticación"])

SessionDb = Annotated[Session, Depends(obtener_session)]


@router.post("/registro", status_code=status.HTTP_201_CREATED, response_model=RespuestaUsuario)
def registrarse(datos: PedidoRegistro, response: Response, session: SessionDb) -> RespuestaUsuario:
    """AUT-001: crea la cuenta y deja la sesión iniciada."""
    usuario = servicio_auth.registrar(session, datos)
    escribir_cookie_sesion(response, usuario.id)
    return RespuestaUsuario.model_validate(usuario, from_attributes=True)
