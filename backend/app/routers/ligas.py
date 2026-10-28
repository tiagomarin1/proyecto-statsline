from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import obtener_session
from app.esquemas.busqueda import LigaRespuesta
from app.repositorios import liga as repositorio_liga
from app.seguridad.dependencias import UsuarioActual

router = APIRouter(prefix="/ligas", tags=["ligas"])


@router.get("", response_model=list[LigaRespuesta])
def listar_ligas(
    _: UsuarioActual, session: Annotated[Session, Depends(obtener_session)]
) -> list[LigaRespuesta]:
    """BUS-002: las ligas del MVP, en el orden del selector, con su cobertura (RN-020)."""
    return [
        LigaRespuesta.model_validate(liga, from_attributes=True)
        for liga in repositorio_liga.listar_en_orden(session)
    ]
