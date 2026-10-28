from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.comparacion import PedidoComparacion, RespuestaComparacion
from app.seguridad.dependencias import UsuarioActual
from app.servicios import comparacion as servicio_comparacion
from app.servicios.edad import obtener_hoy

router = APIRouter(prefix="/comparaciones", tags=["comparaciones"])


@router.post("", response_model=RespuestaComparacion)
def comparar(
    pedido: PedidoComparacion,
    _: UsuarioActual,
    session: Annotated[Session, Depends(obtener_session)],
    hoy: Annotated[date, Depends(obtener_hoy)],
) -> RespuestaComparacion:
    """CMP-001: compara 2 o 3 jugadores lado a lado. No guarda nada."""
    return servicio_comparacion.comparar(session, pedido.jugador_ids, hoy)
