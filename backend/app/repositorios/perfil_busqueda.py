from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modelos import PerfilBusqueda


def obtener_por_usuario(session: Session, usuario_id: int) -> PerfilBusqueda | None:
    return session.scalars(
        select(PerfilBusqueda).where(PerfilBusqueda.usuario_id == usuario_id)
    ).one_or_none()


def guardar(session: Session, usuario_id: int, valores: dict[str, Any]) -> PerfilBusqueda:
    """Crea el perfil del usuario o pisa el que tiene, en una sola sentencia (ON CONFLICT).

    Así dos guardados simultáneos del primer perfil no chocan con el único de usuario_id: el
    segundo espera al primero y lo reemplaza.
    """
    consulta = insert(PerfilBusqueda).values(usuario_id=usuario_id, **valores)
    consulta = consulta.on_conflict_do_update(
        index_elements=["usuario_id"],
        set_={
            **{campo: consulta.excluded[campo] for campo in valores},
            "actualizado_en": func.now(),
        },
    ).returning(PerfilBusqueda)
    return session.scalars(consulta, execution_options={"populate_existing": True}).one()
