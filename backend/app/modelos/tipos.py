from enum import StrEnum

from sqlalchemy import Enum


def enum_mysql(enum: type[StrEnum], nombre: str) -> Enum:
    """ENUM de MySQL que guarda el valor del enum (no el nombre del miembro)."""
    return Enum(enum, name=nombre, values_callable=lambda miembros: [m.value for m in miembros])
