"""Engine y sesión de SQLAlchemy (ADR-0002). Todas las fechas se manejan en UTC."""

import hashlib
import ssl
import tempfile
import time
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

from sqlalchemy import Connection, Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import obtener_configuracion

# Cada conexión trabaja en UTC: así CURRENT_TIMESTAMP coincide con el modelo canónico
OPCIONES_DE_SESION = "-c timezone=UTC"
INTERVALO_REINTENTO_BLOQUEO_SEGUNDOS = 0.5


def guardar_ca(ssl_ca: str) -> Path:
    """libpq lee el CA de un archivo: se escribe una vez en el directorio temporal.

    Falla enseguida con ssl.SSLError si el contenido no es un certificado PEM válido.
    """
    # Algunos paneles guardan el PEM en una sola línea con "\\n" literales
    contenido = ssl_ca.replace("\\n", "\n")
    ssl.create_default_context(cadata=contenido)
    huella = hashlib.sha256(contenido.encode()).hexdigest()[:16]
    archivo = Path(tempfile.gettempdir()) / f"statsline-ca-{huella}.pem"
    if not archivo.exists():
        archivo.write_text(contenido)
    return archivo


def argumentos_de_conexion(ssl_ca: str | None = None) -> dict:
    """Argumentos para psycopg. Con ssl_ca (PEM), la conexión usa TLS y verifica el servidor."""
    argumentos: dict = {"options": OPCIONES_DE_SESION}
    if ssl_ca:
        argumentos["sslmode"] = "verify-full"
        argumentos["sslrootcert"] = str(guardar_ca(ssl_ca))
    return argumentos


def crear_engine(url: str, ssl_ca: str | None = None) -> Engine:
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=argumentos_de_conexion(ssl_ca),
    )


@contextmanager
def bloqueo_exclusivo(conexion: Connection, nombre: str, segundos: int) -> Iterator[None]:
    """Bloqueo consultivo de PostgreSQL: solo una conexión a la vez entra al bloque.

    Reintenta pg_try_advisory_lock hasta `segundos`; si no lo consigue, lanza RuntimeError. El
    bloqueo es de la sesión, no de la transacción: se confirma enseguida para no dejar una
    transacción abierta mientras se espera.
    """
    limite = time.monotonic() + segundos
    while True:
        obtenido = conexion.execute(
            text("SELECT pg_try_advisory_lock(hashtext(:nombre))"), {"nombre": nombre}
        ).scalar()
        conexion.commit()
        if obtenido:
            break
        if time.monotonic() >= limite:
            raise RuntimeError(f"No se pudo tomar el bloqueo '{nombre}' en {segundos} segundos.")
        time.sleep(INTERVALO_REINTENTO_BLOQUEO_SEGUNDOS)
    try:
        yield
    finally:
        conexion.execute(text("SELECT pg_advisory_unlock(hashtext(:nombre))"), {"nombre": nombre})
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
