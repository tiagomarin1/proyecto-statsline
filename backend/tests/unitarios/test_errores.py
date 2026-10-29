"""INF-001: los errores de validación usan el formato del contrato (422, codigo "validacion")."""

from pathlib import Path
from typing import Annotated

import pytest
from fastapi import Body, Query
from fastapi.testclient import TestClient
from pydantic import AfterValidator, BaseModel, model_validator
from sqlalchemy.exc import DataError

from app.errores import _formatear_contexto
from app.esquemas.auth import PedidoRegistro
from app.esquemas.busqueda import FiltrosBusqueda
from app.esquemas.comparacion import PedidoComparacion
from app.esquemas.perfil_busqueda import PedidoPerfilBusqueda
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


def _app_con_rutas_de_prueba(tmp_path: Path) -> TestClient:
    """Rutas sin sesión que validan con los esquemas reales de la API."""
    app = crear_app(directorio_frontend=tmp_path)

    @app.get("/api/v1/prueba-filtros")
    def prueba_filtros(filtros: Annotated[FiltrosBusqueda, Query()]) -> dict:
        return {}

    @app.put("/api/v1/prueba-perfil")
    def prueba_perfil(pedido: PedidoPerfilBusqueda) -> dict:
        return {}

    @app.post("/api/v1/prueba-registro")
    def prueba_registro(pedido: PedidoRegistro) -> dict:
        return {}

    @app.post("/api/v1/prueba-comparacion")
    def prueba_comparacion(pedido: PedidoComparacion) -> dict:
        return {}

    @app.get("/api/v1/prueba-patron")
    def prueba_patron(codigo: Annotated[str, Query(pattern="^[a-z]+$")]) -> dict:
        return {}

    @app.get("/api/v1/prueba-decimales")
    def prueba_decimales(valor: Annotated[float, Query(ge=1234.5)]) -> dict:
        return {}

    def _convertir_con_int(valor: str) -> str:
        int(valor)  # ValueError en inglés: "invalid literal for int() ..."
        return valor

    @app.get("/api/v1/prueba-value-error")
    def prueba_value_error(
        codigo: Annotated[str, AfterValidator(_convertir_con_int), Query()],
    ) -> dict:
        return {}

    @app.put("/api/v1/prueba-cuerpo")
    def prueba_cuerpo(pedido: Annotated[PedidoPerfilBusqueda, Body()]) -> dict:
        return {}

    class ConsultaConReglaDelModelo(BaseModel):
        codigo: str = ""

        @model_validator(mode="after")
        def falla_siempre(self) -> "ConsultaConReglaDelModelo":
            raise ValueError("model error")

    @app.get("/api/v1/prueba-consulta-modelo")
    def prueba_consulta_modelo(consulta: Annotated[ConsultaConReglaDelModelo, Query()]) -> dict:
        return {}

    return TestClient(app)


@pytest.mark.parametrize(
    ("parametros", "campo", "mensaje"),
    [
        ({"edad_min": 10}, "edad_min", "Tiene que ser mayor o igual a 15."),
        ({"edad_max": 50}, "edad_max", "Tiene que ser menor o igual a 45."),
        ({"pases_min": 101}, "pases_min", "Tiene que ser menor o igual a 100."),
        (
            {"presupuesto_max_eur": 10_000},
            "presupuesto_max_eur",
            "Tiene que ser mayor o igual a 20.000.",
        ),
        ({"liga_id": "abc"}, "liga_id", "Tiene que ser un número entero."),
        ({"recuperaciones_min": "abc"}, "recuperaciones_min", "Tiene que ser un número."),
        (
            {"orden": "goles"},
            "orden",
            "Tiene que ser uno de estos valores: minutos, valor, edad, pases o rating.",
        ),
        (
            {"edad_min": 30, "edad_max": 20},
            "edad_max",
            "La edad mínima no puede ser mayor que la edad máxima.",
        ),
    ],
)
def test_inf001_los_errores_de_los_filtros_vienen_en_espanol_y_con_su_campo(
    tmp_path: Path, parametros: dict, campo: str, mensaje: str
):
    respuesta = _app_con_rutas_de_prueba(tmp_path).get("/api/v1/prueba-filtros", params=parametros)

    assert respuesta.status_code == 422
    assert respuesta.json()["errores"] == [{"campo": campo, "mensaje": mensaje}]


def test_inf001_la_edad_invertida_del_perfil_se_marca_en_edad_max(tmp_path: Path):
    respuesta = _app_con_rutas_de_prueba(tmp_path).put(
        "/api/v1/prueba-perfil", json={"edad_min": 30, "edad_max": 20}
    )

    assert respuesta.json()["errores"] == [
        {"campo": "edad_max", "mensaje": "La edad mínima no puede ser mayor que la edad máxima."}
    ]


@pytest.mark.parametrize(
    ("ruta", "cuerpo", "campo", "mensaje"),
    [
        ("/api/v1/prueba-comparacion", {}, "jugador_ids", "Falta este dato."),
        (
            "/api/v1/prueba-comparacion",
            {"jugador_ids": "1,2"},
            "jugador_ids",
            "Tiene que ser una lista.",
        ),
        ("/api/v1/prueba-registro", {"nombre": 3}, "nombre", "Tiene que ser un texto."),
        (
            "/api/v1/prueba-registro",
            {"acepta_terminos": "quizás"},
            "acepta_terminos",
            "Tiene que ser verdadero o falso.",
        ),
    ],
)
def test_inf001_los_errores_del_cuerpo_vienen_en_espanol(
    tmp_path: Path, ruta: str, cuerpo: dict, campo: str, mensaje: str
):
    respuesta = _app_con_rutas_de_prueba(tmp_path).post(ruta, json=cuerpo)

    assert respuesta.status_code == 422
    assert respuesta.json()["errores"] == [{"campo": campo, "mensaje": mensaje}]


def test_inf001_un_error_sin_mensaje_propio_usa_uno_generico_en_espanol(tmp_path: Path):
    respuesta = _app_con_rutas_de_prueba(tmp_path).get(
        "/api/v1/prueba-patron", params={"codigo": "ABC"}
    )

    assert respuesta.json()["errores"] == [{"campo": "codigo", "mensaje": "El valor no es válido."}]


def test_inf001_un_value_error_que_no_es_propio_no_muestra_su_texto_en_ingles(tmp_path: Path):
    respuesta = _app_con_rutas_de_prueba(tmp_path).get(
        "/api/v1/prueba-value-error", params={"codigo": "abc"}
    )

    assert respuesta.json()["errores"] == [{"campo": "codigo", "mensaje": "El valor no es válido."}]


def test_inf001_un_limite_con_decimales_se_escribe_como_en_la_ui(tmp_path: Path):
    respuesta = _app_con_rutas_de_prueba(tmp_path).get(
        "/api/v1/prueba-decimales", params={"valor": 1}
    )

    assert respuesta.json()["errores"] == [
        {"campo": "valor", "mensaje": "Tiene que ser mayor o igual a 1.234,5."}
    ]


@pytest.mark.parametrize(
    ("contenido", "mensaje"),
    [
        ('{"edad_min": 20,', "El cuerpo del pedido no es un JSON válido."),
        ("[1, 2]", "El cuerpo del pedido no tiene el formato esperado."),
    ],
)
def test_inf001_un_error_de_todo_el_cuerpo_se_marca_en_el_campo_cuerpo(
    tmp_path: Path, contenido: str, mensaje: str
):
    respuesta = _app_con_rutas_de_prueba(tmp_path).put(
        "/api/v1/prueba-cuerpo", content=contenido, headers={"Content-Type": "application/json"}
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["errores"] == [{"campo": "cuerpo", "mensaje": mensaje}]


def test_inf001_un_error_de_toda_la_consulta_no_se_marca_en_el_cuerpo(tmp_path: Path):
    respuesta = _app_con_rutas_de_prueba(tmp_path).get("/api/v1/prueba-consulta-modelo")

    assert respuesta.json()["errores"] == [
        {"campo": "consulta", "mensaje": "El valor no es válido."}
    ]


@pytest.mark.parametrize(
    ("clave", "valor", "texto"),
    [
        ("ge", 20_000, "20.000"),
        ("ge", 20_000.0, "20.000"),
        ("ge", 1234.5, "1.234,5"),
        ("gt", 0.00001, "0,00001"),
        ("ge", True, "verdadero"),
        ("expected", "'minutos', 'valor' or 'edad'", "minutos, valor o edad"),
        ("pattern", "'a' or 'b'", "'a' or 'b'"),
    ],
)
def test_inf001_los_datos_del_mensaje_se_escriben_como_en_la_ui(clave: str, valor, texto: str):
    assert _formatear_contexto(clave, valor) == texto
