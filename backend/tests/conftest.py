"""Configuración común de pytest.

- Los unitarios no tocan la base.
- Los de integración usan la base de test (DATABASE_URL_TEST): se recrea con las migraciones
  al inicio de la sesión y cada test corre en una transacción que se deshace al final
  (TESTING_STRATEGY.md).
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, make_url, text
from sqlalchemy.orm import Session

# Valores para los tests, antes de importar la app. Un .env o el entorno pueden pisarlos.
os.environ.setdefault("SECRET_KEY", "clave-solo-para-tests-no-usar-en-produccion")
os.environ.setdefault("ENTORNO", "test")

from app.config import RAIZ_REPO, obtener_configuracion  # noqa: E402
from app.db import crear_engine, obtener_session  # noqa: E402
from app.main import crear_app  # noqa: E402
from tests.base_de_test import validar_nombre_base_de_test  # noqa: E402

DIRECTORIO_BACKEND = RAIZ_REPO / "backend"


def _url_base_de_test() -> str:
    url = os.environ.get("DATABASE_URL_TEST") or obtener_configuracion().database_url_test
    if not url:
        pytest.fail("Falta DATABASE_URL_TEST para los tests de integración (ver docs/SETUP.md).")
    return url


def _recrear_base(url: str) -> None:
    url_test = make_url(url)
    try:
        nombre = validar_nombre_base_de_test(url_test.database)
    except ValueError as error:
        pytest.fail(str(error))
    # CREATE/DROP DATABASE no pueden ir dentro de una transacción: se usa la base "postgres"
    servidor = crear_engine(url_test.set(database="postgres")).execution_options(
        isolation_level="AUTOCOMMIT"
    )
    with servidor.connect() as conexion:
        conexion.execute(text(f'DROP DATABASE IF EXISTS "{nombre}" WITH (FORCE)'))
        conexion.execute(text(f"CREATE DATABASE \"{nombre}\" ENCODING 'UTF8' TEMPLATE template0"))
    servidor.engine.dispose()


@pytest.fixture(scope="session")
def engine_test() -> Iterator[Engine]:
    url = _url_base_de_test()
    _recrear_base(url)
    configuracion_alembic = Config(str(DIRECTORIO_BACKEND / "alembic.ini"))
    configuracion_alembic.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    command.upgrade(configuracion_alembic, "head")
    engine = crear_engine(url)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine_test: Engine) -> Iterator[Session]:
    """Sesión dentro de una transacción que se deshace al terminar el test."""
    with engine_test.connect() as conexion:
        transaccion = conexion.begin()
        with Session(bind=conexion, join_transaction_mode="create_savepoint") as sesion:
            yield sesion
        transaccion.rollback()


@pytest.fixture
def app_test(session: Session, tmp_path: Path) -> FastAPI:
    # Sin build de React: los tests de la API no dependen de que exista frontend/dist
    app = crear_app(directorio_frontend=tmp_path / "sin_build")
    app.dependency_overrides[obtener_session] = lambda: session
    return app


@pytest.fixture
def cliente(app_test: FastAPI) -> Iterator[TestClient]:
    with TestClient(app_test) as cliente:
        yield cliente
