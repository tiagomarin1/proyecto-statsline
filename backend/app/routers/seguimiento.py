from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.busqueda import JugadorResumen
from app.esquemas.seguimiento import PedidoSeguimiento, RespuestaGuardado
from app.seguridad.dependencias import UsuarioActual
from app.servicios import seguimiento as servicio_seguimiento
from app.servicios.edad import obtener_hoy

router = APIRouter(prefix="/seguimiento", tags=["seguimiento"])


@router.get("", response_model=list[JugadorResumen])
def listar_seguimiento(
    usuario: UsuarioActual,
    session: Annotated[Session, Depends(obtener_session)],
    hoy: Annotated[date, Depends(obtener_hoy)],
) -> list[JugadorResumen]:
    """SEG-001: la lista del usuario, del más reciente al más viejo (RN-026)."""
    return servicio_seguimiento.listar(session, usuario.id, hoy)


@router.post("", response_model=RespuestaGuardado, status_code=status.HTTP_201_CREATED)
def guardar_en_seguimiento(
    pedido: PedidoSeguimiento,
    response: Response,
    usuario: UsuarioActual,
    session: Annotated[Session, Depends(obtener_session)],
) -> RespuestaGuardado:
    """SEG-001: 201 si se agregó, 200 si ya estaba (RN-026)."""
    respuesta, agregado = servicio_seguimiento.guardar(session, usuario.id, pedido.jugador_id)
    if not agregado:
        response.status_code = status.HTTP_200_OK
    return respuesta


@router.delete("/{jugador_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_de_seguimiento(
    jugador_id: int,
    usuario: UsuarioActual,
    session: Annotated[Session, Depends(obtener_session)],
) -> Response:
    """SEG-001: 204 aunque el jugador no estuviera en la lista."""
    servicio_seguimiento.quitar(session, usuario.id, jugador_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
