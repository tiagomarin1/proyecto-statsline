from sqlalchemy import Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id
from app.modelos.enums import Cobertura, FuenteDatos
from app.modelos.tipos import tipo_enum


class Liga(Base):
    """Competición cubierta por el MVP. Se carga con semillas/ligas.py."""

    __tablename__ = "liga"

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    id_api_football: Mapped[int] = mapped_column(Integer, unique=True)
    id_sportmonks: Mapped[int | None] = mapped_column(Integer, unique=True)
    # De dónde salen las estadísticas de esta liga (RN-029). Una sola fuente por liga
    fuente: Mapped[FuenteDatos] = mapped_column(
        tipo_enum(FuenteDatos, "fuente_datos"),
        default=FuenteDatos.api_football,
        server_default=FuenteDatos.api_football.value,
    )
    nombre: Mapped[str] = mapped_column(String(80))
    temporada_actual: Mapped[int] = mapped_column(SmallInteger)
    # Se recalcula al final de cada sincronización (RN-020)
    cobertura: Mapped[Cobertura] = mapped_column(
        tipo_enum(Cobertura, "cobertura"),
        default=Cobertura.sin_datos,
        server_default=Cobertura.sin_datos.value,
    )
    orden: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
