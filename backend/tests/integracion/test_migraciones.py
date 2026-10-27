"""INF-001: la migración inicial crea todas las tablas del modelo canónico."""

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Engine, inspect

from app.modelos import Base

pytestmark = pytest.mark.integracion

TABLAS_DEL_MODELO_CANONICO = {
    "usuario",
    "liga",
    "equipo",
    "jugador",
    "estadistica_temporada",
    "perfil_busqueda",
    "seguimiento",
    "sincronizacion",
}


def test_inf001_la_migracion_crea_todas_las_tablas(engine_test: Engine):
    tablas = set(inspect(engine_test).get_table_names()) - {"alembic_version"}

    assert tablas == TABLAS_DEL_MODELO_CANONICO


def test_inf001_la_migracion_coincide_con_los_modelos(engine_test: Engine):
    with engine_test.connect() as conexion:
        contexto = MigrationContext.configure(conexion, opts={"compare_type": True})
        diferencias = compare_metadata(contexto, Base.metadata)

    assert diferencias == []


def test_inf001_las_tablas_usan_utf8mb4(engine_test: Engine):
    inspector = inspect(engine_test)
    for tabla in TABLAS_DEL_MODELO_CANONICO:
        assert inspector.get_table_options(tabla)["mysql_default charset"] == "utf8mb4"
