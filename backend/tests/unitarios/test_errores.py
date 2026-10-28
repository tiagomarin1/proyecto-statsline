"""INF-001: los errores de validación usan el formato del contrato (422, codigo "validacion")."""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.exc import DataError

from app.main import crear_app


def test_inf001_un_dato_invalido_responde_422_con_el_campo_y_el_mensaje(tmp_path: Path):
    app = crear_app(directorio_frontend=tmp_path)

    @app.get("/api/v1/prueba")
    def prueba(edad_min: int) -> dict:
        return {"edad_min": edad_min}

    respuesta = TestClient(app).get("/api/v1/prueba", params={"edad_min": "veinte"})

    assert respuesta.status_code == 422
    cuerpo = respuesta.json()
    assert cuerpo["codigo"] == "validacion"
    assert cuerpo["detalle"] == "Hay datos inválidos en el pedido."
    assert [error["campo"] for error in cuerpo["errores"]] == ["edad_min"]


def test_inf001_un_dato_que_la_base_rechaza_responde_422_y_no_500(tmp_path: Path):
    # Por ejemplo, un id fuera del rango de BIGINT o un texto más largo que la columna
    app = crear_app(directorio_frontend=tmp_path)

    @app.get("/api/v1/prueba")
    def prueba() -> dict:
        raise DataError("SELECT ...", {}, Exception("bigint out of range"))

    respuesta = TestClient(app, raise_server_exceptions=False).get("/api/v1/prueba")

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "Hay datos inválidos en el pedido.",
        "codigo": "validacion",
    }
