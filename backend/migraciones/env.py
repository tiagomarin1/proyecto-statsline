"""Entorno de Alembic. Las migraciones salen de MODELO_CANONICO_DE_DATOS.md vía app/modelos."""

from alembic import context

import app.modelos  # noqa: F401  (registra todas las tablas en Base.metadata)
from app.config import obtener_configuracion
from app.db import crear_engine
from app.modelos.base import Base

target_metadata = Base.metadata


def _url_y_ssl() -> tuple[str, str | None]:
    # Los tests pasan la URL de la base de test por la configuración de Alembic (sin TLS)
    url_de_test = context.config.get_main_option("sqlalchemy.url")
    if url_de_test:
        return url_de_test, None
    configuracion = obtener_configuracion()
    return configuracion.database_url, configuracion.database_ssl_ca


def correr_offline() -> None:
    context.configure(url=_url_y_ssl()[0], target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def correr_online() -> None:
    engine = crear_engine(*_url_y_ssl())
    with engine.connect() as conexion:
        context.configure(connection=conexion, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    correr_offline()
else:
    correr_online()
