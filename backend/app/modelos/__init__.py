"""Modelos ORM: un archivo por entidad. Importar este paquete registra todas las tablas."""

from app.modelos.base import Base
from app.modelos.equipo import Equipo
from app.modelos.estadistica_temporada import EstadisticaTemporada
from app.modelos.jugador import Jugador
from app.modelos.liga import Liga
from app.modelos.perfil_busqueda import PerfilBusqueda
from app.modelos.seguimiento import Seguimiento
from app.modelos.sincronizacion import Sincronizacion
from app.modelos.usuario import Usuario

__all__ = [
    "Base",
    "Equipo",
    "EstadisticaTemporada",
    "Jugador",
    "Liga",
    "PerfilBusqueda",
    "Seguimiento",
    "Sincronizacion",
    "Usuario",
]
