from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.mysql import INTEGER, TINYINT
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id, columna_actualizado_en
from app.modelos.enums import Posicion
from app.modelos.tipos import enum_mysql


class PerfilBusqueda(Base):
    """Filtros guardados. Uno por usuario en el MVP (RN-023). Nulo = sin ese filtro."""

    __tablename__ = "perfil_busqueda"
    __table_args__ = (
        CheckConstraint("edad_min BETWEEN 15 AND 45", name="edad_min_rango"),
        CheckConstraint("edad_max BETWEEN 15 AND 45", name="edad_max_rango"),
        CheckConstraint("edad_min <= edad_max", name="edad_min_hasta_edad_max"),
    )

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(Id, ForeignKey("usuario.id"), unique=True)
    posicion: Mapped[Posicion] = mapped_column(enum_mysql(Posicion, "posicion"))
    liga_id: Mapped[int] = mapped_column(Id, ForeignKey("liga.id"))
    edad_min: Mapped[int] = mapped_column(TINYINT)
    edad_max: Mapped[int] = mapped_column(TINYINT)
    presupuesto_max_eur: Mapped[int | None] = mapped_column(INTEGER(unsigned=True))
    pases_min: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    duelos_min: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    recuperaciones_min: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    minutos_min: Mapped[int | None] = mapped_column(Integer)
    actualizado_en: Mapped[datetime] = columna_actualizado_en()
