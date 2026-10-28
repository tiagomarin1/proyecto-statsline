from sqlalchemy import RowMapping, Select, func, select
from sqlalchemy.orm import Session


def contar(session: Session, consulta: Select) -> int:
    return session.scalar(select(func.count()).select_from(consulta.order_by(None).subquery()))


def listar(session: Session, consulta: Select, limite: int, desde: int) -> list[RowMapping]:
    return list(session.execute(consulta.limit(limite).offset(desde)).mappings())
