from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import AHORA, Base, Id
from app.modelos.enums import Posicion
from app.modelos.tipos import enum_mysql


class EstadisticaTemporada(Base):
    """Números de un jugador en una liga, un equipo y una temporada.

    Una fila por cada entrada de statistics[] de API-Football. NULL = dato no disponible,
    nunca 0 (RN-008). duelos_ganados_pct, recuperaciones_por_partido y edad se calculan
    al leer (RN-018).
    """

    __tablename__ = "estadistica_temporada"
    __table_args__ = (
        UniqueConstraint("jugador_id", "liga_id", "equipo_id", "temporada"),
        # Patrón de búsqueda principal
        Index(None, "temporada", "posicion", "liga_id"),
        CheckConstraint(
            "partidos_jugados >= 0 AND minutos_jugados >= 0 AND goles >= 0"
            " AND asistencias >= 0 AND duelos_totales >= 0 AND duelos_ganados >= 0"
            " AND intercepciones >= 0",
            name="contadores_no_negativos",
        ),
        CheckConstraint("duelos_ganados <= duelos_totales", name="duelos_ganados_hasta_totales"),
        CheckConstraint("pases_precision_pct BETWEEN 0 AND 100", name="pases_precision_pct_rango"),
    )

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    jugador_id: Mapped[int] = mapped_column(Id, ForeignKey("jugador.id"), index=True)
    liga_id: Mapped[int] = mapped_column(Id, ForeignKey("liga.id"))
    equipo_id: Mapped[int] = mapped_column(Id, ForeignKey("equipo.id"))
    temporada: Mapped[int] = mapped_column(SmallInteger)
    posicion: Mapped[Posicion | None] = mapped_column(enum_mysql(Posicion, "posicion"))
    partidos_jugados: Mapped[int | None] = mapped_column(SmallInteger)  # games.appearences
    minutos_jugados: Mapped[int | None] = mapped_column(Integer)
    goles: Mapped[int | None] = mapped_column(SmallInteger)
    asistencias: Mapped[int | None] = mapped_column(SmallInteger)
    pases_precision_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    duelos_totales: Mapped[int | None] = mapped_column(SmallInteger)
    duelos_ganados: Mapped[int | None] = mapped_column(SmallInteger)
    rating: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    intercepciones: Mapped[int | None] = mapped_column(SmallInteger)
    sincronizado_en: Mapped[datetime] = mapped_column(
        DateTime, server_default=AHORA, onupdate=func.now()
    )
