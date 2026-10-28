from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id, columna_creado_en
from app.modelos.enums import Rol
from app.modelos.tipos import tipo_enum


class Usuario(Base):
    """Persona con cuenta. El club es texto libre (la gestión de clubes es R3)."""

    __tablename__ = "usuario"
    # Se guarda en minúsculas: así el único de email no distingue mayúsculas
    __table_args__ = (CheckConstraint("email = lower(email)", name="email_en_minusculas"),)

    id: Mapped[int] = mapped_column(Id, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(tipo_enum(Rol, "rol"))
    club: Mapped[str] = mapped_column(String(120))
    terminos_aceptados_en: Mapped[datetime] = mapped_column(DateTime)
    creado_en: Mapped[datetime] = columna_creado_en()
