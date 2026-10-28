from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import Liga


def obtener_por_id(session: Session, liga_id: int) -> Liga | None:
    return session.get(Liga, liga_id)


def listar_en_orden(session: Session) -> list[Liga]:
    return list(session.scalars(select(Liga).order_by(Liga.orden, Liga.id)))
