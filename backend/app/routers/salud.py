from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.salud import RespuestaSalud
from app.repositorios.salud import base_de_datos_disponible

router = APIRouter(tags=["salud"])


@router.get("/salud", response_model=RespuestaSalud)
def obtener_salud(
    response: Response, session: Annotated[Session, Depends(obtener_session)]
) -> RespuestaSalud:
    """Healthcheck de Railway: 200 si la API y la base responden, 503 si la base no responde."""
    if base_de_datos_disponible(session):
        return RespuestaSalud(estado="ok", base_de_datos="ok")
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return RespuestaSalud(estado="error", base_de_datos="error")
