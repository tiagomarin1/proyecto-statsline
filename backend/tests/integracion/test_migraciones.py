"""INF-001: la migración inicial crea todas las tablas del modelo canónico."""

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Engine, inspect, text

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


def test_inf001_la_base_usa_utf8(engine_test: Engine):
    with engine_test.connect() as conexion:
        codificacion = conexion.execute(
            text(
                "SELECT pg_encoding_to_char(encoding) FROM pg_database"
                " WHERE datname = current_database()"
            )
        ).scalar()

    assert codificacion == "UTF8"


def test_inf001_cada_conexion_trabaja_en_utc(engine_test: Engine):
    with engine_test.connect() as conexion:
        assert conexion.execute(text("SHOW timezone")).scalar() == "UTC"
