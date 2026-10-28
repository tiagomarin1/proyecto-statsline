from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.busqueda import FiltrosBusqueda, RespuestaBusqueda
from app.seguridad.dependencias import UsuarioActual
from app.servicios import busqueda as servicio_busqueda
from app.servicios.edad import obtener_hoy

router = APIRouter(prefix="/jugadores", tags=["jugadores"])


@router.get("", response_model=RespuestaBusqueda)
def buscar_jugadores(
    filtros: Annotated[FiltrosBusqueda, Query()],
    usuario: UsuarioActual,
    session: Annotated[Session, Depends(obtener_session)],
    hoy: Annotated[date, Depends(obtener_hoy)],
) -> RespuestaBusqueda:
    """BUS-001 a BUS-004: candidatos filtrados por posición, edad, liga, presupuesto y métricas."""
    return servicio_busqueda.buscar_jugadores(session, filtros, usuario.id, hoy)
