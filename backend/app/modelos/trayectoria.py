from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import AHORA, Base, Id


class Trayectoria(Base):
    """Un jugador, un club y una temporada (DAT-004). NULL en `temporada` = la API no informa años.

    El club no es una FK a `equipo`: puede ser un club en el que nunca jugó en las 6 ligas del MVP.
    Las selecciones nacionales no se guardan (RN-033).
    """

    __tablename__ = "trayectoria"
    __table_args__ = (
        CheckConstraint("temporada BETWEEN 1900 AND 2100", name="temporada_valida"),
        # El NULL cuenta como un valor más: un club sin año se guarda una sola vez por jugador
        Index(
            "uq_trayectoria_jugador_club_temporada",
            "jugador_id",
            "id_club_api_football",
            "temporada",
            unique=True,
            postgresql_where=text("temporada IS NOT NULL"),
        ),
        Index(
            "uq_trayectoria_jugador_club_sin_temporada",
            "jugador_id",
            "id_club_api_football",
            unique=True,
            postgresql_where=text("temporada IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    jugador_id: Mapped[int] = mapped_column(Id, ForeignKey("jugador.id"), index=True)
    id_club_api_football: Mapped[int] = mapped_column(Integer)
    nombre_club: Mapped[str] = mapped_column(String(120))
    temporada: Mapped[int | None] = mapped_column(SmallInteger)
    sincronizado_en: Mapped[datetime] = mapped_column(DateTime, server_default=AHORA)
