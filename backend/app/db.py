"""Engine y sesión de SQLAlchemy (ADR-0002). Todas las fechas se manejan en UTC."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.config import obtener_configuracion


def crear_engine(url: str) -> Engine:
    engine = create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={"charset": "utf8mb4"},
    )

    @event.listens_for(engine, "connect")
    def _usar_utc(conexion_dbapi, _registro) -> None:
        # Así NOW() y CURRENT_TIMESTAMP devuelven UTC, como pide el modelo canónico
        with conexion_dbapi.cursor() as cursor:
            cursor.execute("SET time_zone = '+00:00'")

    return engine


@lru_cache
def obtener_engine() -> Engine:
    return crear_engine(obtener_configuracion().database_url)


@lru_cache
def obtener_fabrica_sesiones() -> sessionmaker[Session]:
    return sessionmaker(bind=obtener_engine(), expire_on_commit=False)


def obtener_session() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión por pedido."""
    with obtener_fabrica_sesiones()() as session:
        yield session
