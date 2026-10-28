from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id, columna_actualizado_en


class Jugador(Base):
    """Datos personales del jugador. Las estadísticas van en EstadisticaTemporada."""

    __tablename__ = "jugador"
    __table_args__ = (
        CheckConstraint("valor_mercado_eur >= 0", name="valor_mercado_eur_no_negativo"),
    )

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    id_api_football: Mapped[int] = mapped_column(Integer, unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    nombre_pila: Mapped[str | None] = mapped_column(String(80))
    apellido: Mapped[str | None] = mapped_column(String(80))
    # Con esto se calcula la edad (RN-009)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date, index=True)
    nacionalidad: Mapped[str | None] = mapped_column(String(60))
    # NULL = costo no disponible (RN-002)
    valor_mercado_eur: Mapped[int | None] = mapped_column(Integer, index=True)
    id_transfermarkt: Mapped[int | None] = mapped_column(Integer, unique=True)
    valor_mercado_fecha: Mapped[date | None] = mapped_column(Date)
    actualizado_en: Mapped[datetime] = columna_actualizado_en()
