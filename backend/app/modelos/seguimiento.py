from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.modelos.base import Base, Id, columna_creado_en


class Seguimiento(Base):
    """Jugador guardado en la lista de seguimiento de un usuario (RN-026).

    La PK compuesta garantiza que un jugador aparezca una sola vez por usuario.
    """

    __tablename__ = "seguimiento"

    usuario_id: Mapped[int] = mapped_column(Id, ForeignKey("usuario.id"), primary_key=True)
    jugador_id: Mapped[int] = mapped_column(Id, ForeignKey("jugador.id"), primary_key=True)
    # La lista se ordena por este campo, del más reciente al más viejo
    creado_en: Mapped[datetime] = columna_creado_en()
