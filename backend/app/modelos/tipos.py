from enum import StrEnum

from sqlalchemy import Enum


def tipo_enum(enum: type[StrEnum], nombre: str) -> Enum:
    """VARCHAR con un CHECK de los valores permitidos (no un ENUM nativo de PostgreSQL).

    Guarda el valor del enum, no el nombre del miembro. Así las migraciones no tienen que crear
    ni borrar tipos (ADR-0010).
    """
    return Enum(
        enum,
        name=nombre,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda miembros: [m.value for m in miembros],
    )
