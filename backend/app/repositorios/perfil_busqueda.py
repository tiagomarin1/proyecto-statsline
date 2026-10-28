from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import PerfilBusqueda


def obtener_por_usuario(session: Session, usuario_id: int) -> PerfilBusqueda | None:
    return session.scalars(
        select(PerfilBusqueda).where(PerfilBusqueda.usuario_id == usuario_id)
    ).one_or_none()


def agregar(session: Session, perfil: PerfilBusqueda) -> PerfilBusqueda:
    session.add(perfil)
    session.flush()
    return perfil
