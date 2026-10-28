from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.busqueda import FiltrosBusqueda, RespuestaBusqueda
from app.esquemas.ficha import FichaJugador
from app.seguridad.dependencias import UsuarioActual
from app.servicios import busqueda as servicio_busqueda
from app.servicios import ficha as servicio_ficha
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


@router.get("/{jugador_id}", response_model=FichaJugador)
def obtener_ficha(
    jugador_id: int,
    filtros: Annotated[FiltrosBusqueda, Query()],
    usuario: UsuarioActual,
    session: Annotated[Session, Depends(obtener_session)],
    hoy: Annotated[date, Depends(obtener_hoy)],
) -> FichaJugador:
    """JUG-001: ficha del jugador. Los filtros son opcionales y solo sirven para la coincidencia
    con el perfil (RN-012): el frontend manda el perfil guardado o los filtros actuales."""
    return servicio_ficha.obtener_ficha(session, jugador_id, usuario.id, filtros, hoy)
