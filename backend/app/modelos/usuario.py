from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id, columna_creado_en
from app.modelos.enums import Rol
from app.modelos.tipos import enum_mysql


class Usuario(Base):
    """Persona con cuenta. El club es texto libre (la gestión de clubes es R3)."""

    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(120))
    # Se guarda en minúsculas y sin espacios: el único es efectivamente sin distinguir mayúsculas
    email: Mapped[str] = mapped_column(String(254), unique=True)
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(enum_mysql(Rol, "rol"))
    club: Mapped[str] = mapped_column(String(120))
    terminos_aceptados_en: Mapped[datetime] = mapped_column(DateTime)
    creado_en: Mapped[datetime] = columna_creado_en()
