"""INF-001: FastAPI sirve el build de React y la API sigue respondiendo JSON (ADR-0003)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import crear_app


@pytest.fixture
def build_react(tmp_path: Path) -> Path:
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<div id='root'>StatsLine</div>")
    (tmp_path / "assets" / "app.js").write_text("console.log('ok')")
    (tmp_path.parent / "secreto.txt").write_text("no se sirve")
    return tmp_path


@pytest.fixture
def cliente(build_react: Path) -> TestClient:
    return TestClient(crear_app(directorio_frontend=build_react))


def test_inf001_la_raiz_devuelve_index_html(cliente: TestClient):
    respuesta = cliente.get("/")

    assert respuesta.status_code == 200
    assert "StatsLine" in respuesta.text


def test_inf001_una_ruta_del_spa_devuelve_index_html(cliente: TestClient):
    respuesta = cliente.get("/buscar")

    assert respuesta.status_code == 200
    assert "StatsLine" in respuesta.text


def test_inf001_los_archivos_del_build_se_sirven_tal_cual(cliente: TestClient):
    respuesta = cliente.get("/assets/app.js")

    assert respuesta.status_code == 200
    assert respuesta.text == "console.log('ok')"


def test_inf001_no_se_sirven_archivos_fuera_del_build(cliente: TestClient):
    respuesta = cliente.get("/..%2Fsecreto.txt")

    assert "no se sirve" not in respuesta.text


def test_inf001_una_ruta_inexistente_de_la_api_responde_404_en_json(cliente: TestClient):
    respuesta = cliente.get("/api/v1/no-existe")

    assert respuesta.status_code == 404
    assert respuesta.json() == {
        "detalle": "No existe el recurso pedido.",
        "codigo": "no_encontrado",
    }


def test_inf001_la_documentacion_de_la_api_sigue_disponible(cliente: TestClient):
    assert cliente.get("/docs").status_code == 200
    assert cliente.get("/openapi.json").status_code == 200


def test_inf001_sin_build_de_react_la_api_funciona_igual(tmp_path: Path):
    cliente = TestClient(crear_app(directorio_frontend=tmp_path / "no-existe"))

    assert cliente.get("/").status_code == 404
    assert cliente.get("/docs").status_code == 200
