from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import Usuario


def obtener_por_id(session: Session, usuario_id: int) -> Usuario | None:
    return session.get(Usuario, usuario_id)


def agregar(session: Session, usuario: Usuario) -> Usuario:
    """Guarda el usuario y le asigna el id. Lanza IntegrityError si el email ya existe."""
    session.add(usuario)
    session.flush()
    return usuario


def obtener_por_email(session: Session, email: str) -> Usuario | None:
    """El email tiene que venir ya normalizado (minúsculas y sin espacios)."""
    return session.scalars(select(Usuario).where(Usuario.email == email)).one_or_none()
