from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id


class Equipo(Base):
    """Club real en el que juega el jugador, según API-Football. No es el club del usuario."""

    __tablename__ = "equipo"
    __table_args__ = (
        CheckConstraint(
            "id_api_football IS NOT NULL OR id_sportmonks IS NOT NULL", name="tiene_id_de_fuente"
        ),
    )

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    # Un equipo que solo existe en Sportmonks no tiene id de API-Football: tiene que tener alguno
    id_api_football: Mapped[int | None] = mapped_column(Integer, unique=True)
    id_sportmonks: Mapped[int | None] = mapped_column(Integer, unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
