"""Base declarativa y tipos comunes del modelo canónico (MODELO_CANONICO_DE_DATOS.md)."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, MetaData, func, text
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Nombres fijos para índices y restricciones: así la migración y los modelos coinciden
CONVENCION_DE_NOMBRES = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# Default de las columnas de auditoría (la sesión corre en UTC, ver db.py)
AHORA = text("CURRENT_TIMESTAMP")

# Claves primarias y foráneas: BIGINT UNSIGNED
Id = BIGINT(unsigned=True)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCION_DE_NOMBRES)


def ahora_utc() -> datetime:
    """Fecha y hora actual en UTC, sin zona: así se guarda en las columnas DATETIME."""
    return datetime.now(UTC).replace(tzinfo=None)


def columna_creado_en() -> Mapped[datetime]:
    return mapped_column(DateTime, nullable=False, server_default=AHORA)


def columna_actualizado_en() -> Mapped[datetime]:
    return mapped_column(DateTime, nullable=False, server_default=AHORA, onupdate=func.now())
