"""Engine y sesión de SQLAlchemy (ADR-0002). Todas las fechas se manejan en UTC."""

import ssl
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache

from sqlalchemy import Connection, Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import obtener_configuracion


def argumentos_de_conexion(ssl_ca: str | None = None) -> dict:
    """Argumentos para PyMySQL. Con ssl_ca (PEM), la conexión usa TLS y verifica el servidor."""
    argumentos: dict = {"charset": "utf8mb4"}
    if ssl_ca:
        # Algunos paneles guardan el PEM en una sola línea con "\\n" literales
        argumentos["ssl"] = ssl.create_default_context(cadata=ssl_ca.replace("\\n", "\n"))
    return argumentos


def crear_engine(url: str, ssl_ca: str | None = None) -> Engine:
    engine = create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=argumentos_de_conexion(ssl_ca),
    )

    @event.listens_for(engine, "connect")
    def _usar_utc(conexion_dbapi, _registro) -> None:
        # Así NOW() y CURRENT_TIMESTAMP devuelven UTC, como pide el modelo canónico
        with conexion_dbapi.cursor() as cursor:
            cursor.execute("SET time_zone = '+00:00'")

    return engine


@contextmanager
def bloqueo_exclusivo(conexion: Connection, nombre: str, segundos: int) -> Iterator[None]:
    """Bloqueo con nombre de MySQL (GET_LOCK): solo una conexión a la vez entra al bloque.

    Si no se consigue en `segundos`, lanza RuntimeError. El bloqueo es de la conexión, no de la
    transacción: se confirma enseguida para no dejar una transacción abierta mientras se espera.
    """
    obtenido = conexion.execute(
        text("SELECT GET_LOCK(:nombre, :segundos)"), {"nombre": nombre, "segundos": segundos}
    ).scalar()
    conexion.commit()
    if obtenido != 1:
        raise RuntimeError(f"No se pudo tomar el bloqueo '{nombre}' en {segundos} segundos.")
    try:
        yield
    finally:
        conexion.execute(text("SELECT RELEASE_LOCK(:nombre)"), {"nombre": nombre})
        conexion.commit()


@lru_cache
def obtener_engine() -> Engine:
    configuracion = obtener_configuracion()
    return crear_engine(configuracion.database_url, configuracion.database_ssl_ca)


@lru_cache
def obtener_fabrica_sesiones() -> sessionmaker[Session]:
    return sessionmaker(bind=obtener_engine(), expire_on_commit=False)


def obtener_session() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión por pedido."""
    with obtener_fabrica_sesiones()() as session:
        yield session
