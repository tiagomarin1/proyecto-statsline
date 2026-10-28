from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import AHORA, Base, Id
from app.modelos.enums import EstadoSincronizacion, OrigenSincronizacion
from app.modelos.tipos import tipo_enum


class Sincronizacion(Base):
    """Registro de cada corrida de sincronización, para auditar y diagnosticar errores."""

    __tablename__ = "sincronizacion"

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    origen: Mapped[OrigenSincronizacion] = mapped_column(
        tipo_enum(OrigenSincronizacion, "origen_sincronizacion")
    )
    # Nulo para Transfermarkt
    liga_id: Mapped[int | None] = mapped_column(Id, ForeignKey("liga.id"))
    temporada: Mapped[int | None] = mapped_column(SmallInteger)
    iniciada_en: Mapped[datetime] = mapped_column(DateTime, server_default=AHORA)
    finalizada_en: Mapped[datetime | None] = mapped_column(DateTime)
    estado: Mapped[EstadoSincronizacion] = mapped_column(
        tipo_enum(EstadoSincronizacion, "estado_sincronizacion"),
        default=EstadoSincronizacion.en_curso,
        server_default=EstadoSincronizacion.en_curso.value,
    )
    # Pedidos hechos a API-Football (cupo de 7.500 por día)
    pedidos_usados: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    registros_actualizados: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    mensaje_error: Mapped[str | None] = mapped_column(Text)
