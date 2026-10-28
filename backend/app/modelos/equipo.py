from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id


class Equipo(Base):
    """Club real en el que juega el jugador, según API-Football. No es el club del usuario."""

    __tablename__ = "equipo"

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    id_api_football: Mapped[int] = mapped_column(Integer, unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
