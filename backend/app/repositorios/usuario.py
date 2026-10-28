from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import Usuario


def obtener_por_id(session: Session, usuario_id: int) -> Usuario | None:
    return session.get(Usuario, usuario_id)


def obtener_por_email(session: Session, email: str) -> Usuario | None:
    """El email tiene que venir ya normalizado (minúsculas y sin espacios)."""
    return session.scalars(select(Usuario).where(Usuario.email == email)).one_or_none()
