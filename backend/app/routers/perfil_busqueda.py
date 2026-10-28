from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.perfil_busqueda import PedidoPerfilBusqueda, RespuestaPerfilBusqueda
from app.seguridad.dependencias import UsuarioActual
from app.servicios import perfil_busqueda as servicio_perfil

router = APIRouter(prefix="/perfil-busqueda", tags=["perfil de búsqueda"])

SessionDb = Annotated[Session, Depends(obtener_session)]


@router.get("", response_model=RespuestaPerfilBusqueda)
def obtener_perfil(usuario: UsuarioActual, session: SessionDb) -> RespuestaPerfilBusqueda:
    """BUS-005: el perfil guardado del usuario. 404 sin_perfil si no tiene."""
    perfil = servicio_perfil.obtener(session, usuario.id)
    return RespuestaPerfilBusqueda.model_validate(perfil, from_attributes=True)


@router.put("", response_model=RespuestaPerfilBusqueda)
def guardar_perfil(
    pedido: PedidoPerfilBusqueda, usuario: UsuarioActual, session: SessionDb
) -> RespuestaPerfilBusqueda:
    """BUS-005: crea el perfil o reemplaza al anterior."""
    perfil = servicio_perfil.guardar(session, usuario.id, pedido)
    return RespuestaPerfilBusqueda.model_validate(perfil, from_attributes=True)
