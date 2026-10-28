"""INF-001: GET /api/v1/salud responde 200 {"estado": "ok", "base_de_datos": "ok"}."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db import crear_engine, obtener_session

pytestmark = pytest.mark.integracion


def test_inf001_salud_responde_ok_con_la_base_disponible(cliente: TestClient):
    respuesta = cliente.get("/api/v1/salud")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok", "base_de_datos": "ok"}


def test_inf001_salud_responde_503_si_la_base_no_responde(app_test: FastAPI):
    # Puerto 1: nadie escucha, la conexión falla en el acto
    engine_caido = crear_engine("postgresql+psycopg://nadie:nada@127.0.0.1:1/no_existe")

    def session_caida():
        with Session(bind=engine_caido) as session:
            yield session

    app_test.dependency_overrides[obtener_session] = session_caida
    respuesta = TestClient(app_test).get("/api/v1/salud")

    assert respuesta.status_code == 503
    assert respuesta.json() == {"estado": "error", "base_de_datos": "error"}
