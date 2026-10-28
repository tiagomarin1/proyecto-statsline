"""INF-001: el bloqueo de MySQL que serializa migraciones y semillas al arrancar (ADR-0009)."""

import pytest
from sqlalchemy import Engine

from app.db import bloqueo_exclusivo

pytestmark = pytest.mark.integracion

NOMBRE = "statsline_bloqueo_de_prueba"


def test_inf001_mientras_una_conexion_tiene_el_bloqueo_otra_no_entra(engine_test: Engine):
    with (
        engine_test.connect() as primera,
        engine_test.connect() as segunda,
        bloqueo_exclusivo(primera, NOMBRE, segundos=1),
        pytest.raises(RuntimeError, match=NOMBRE),
        bloqueo_exclusivo(segunda, NOMBRE, segundos=0),
    ):
        pass


def test_inf001_al_salir_del_bloque_el_bloqueo_se_libera(engine_test: Engine):
    with engine_test.connect() as primera, engine_test.connect() as segunda:
        with bloqueo_exclusivo(primera, NOMBRE, segundos=1):
            pass
        with bloqueo_exclusivo(segunda, NOMBRE, segundos=0):
            pass


def test_inf001_el_bloqueo_no_deja_una_transaccion_abierta(engine_test: Engine):
    with engine_test.connect() as conexion, bloqueo_exclusivo(conexion, NOMBRE, segundos=1):
        assert not conexion.in_transaction()
