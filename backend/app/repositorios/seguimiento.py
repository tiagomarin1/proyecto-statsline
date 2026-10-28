from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modelos import Seguimiento


def agregar(session: Session, usuario_id: int, jugador_id: int) -> bool:
    """Guarda el jugador en la lista del usuario. Devuelve False si ya estaba (no duplica)."""
    consulta = (
        insert(Seguimiento)
        .values(usuario_id=usuario_id, jugador_id=jugador_id)
        .on_conflict_do_nothing()
        .returning(Seguimiento.jugador_id)
    )
    return session.execute(consulta).first() is not None


def quitar(session: Session, usuario_id: int, jugador_id: int) -> None:
    session.execute(
        delete(Seguimiento).where(
            Seguimiento.usuario_id == usuario_id, Seguimiento.jugador_id == jugador_id
        )
    )
