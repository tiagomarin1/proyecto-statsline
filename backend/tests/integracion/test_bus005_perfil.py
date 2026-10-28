"""BUS-005: GET y PUT /api/v1/perfil-busqueda (RN-023, RN-024)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import PerfilBusqueda
from app.seguridad.dependencias import NOMBRE_COOKIE_SESION
from app.seguridad.tokens import crear_token_sesion
from tests.fabricas import crear_liga, crear_usuario

pytestmark = pytest.mark.integracion

URL = "/api/v1/perfil-busqueda"


@pytest.fixture
def liga(session: Session):
    return crear_liga(session, nombre="Primera Nacional")


def _perfil(liga, **cambios) -> dict:
    return {"posicion": "defensor", "liga_id": liga.id, "edad_min": 20, "edad_max": 27} | cambios


def _cantidad_de_perfiles(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(PerfilBusqueda))


def test_bus005_guardar_el_perfil(cliente_con_sesion: TestClient, liga):
    respuesta = cliente_con_sesion.put(URL, json=_perfil(liga))

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "posicion": "defensor",
        "liga_id": liga.id,
        "edad_min": 20,
        "edad_max": 27,
        "presupuesto_max_eur": None,
        "pases_min": None,
        "duelos_min": None,
        "recuperaciones_min": None,
        "minutos_min": None,
    }


def test_bus005_cargar_el_perfil_guardado_con_los_opcionales(cliente_con_sesion: TestClient, liga):
    perfil = _perfil(
        liga,
        presupuesto_max_eur=150_000,
        pases_min=80,
        duelos_min=55.5,
        recuperaciones_min=1.5,
        minutos_min=1000,
    )
    cliente_con_sesion.put(URL, json=perfil)

    respuesta = cliente_con_sesion.get(URL)

    assert respuesta.status_code == 200
    assert respuesta.json() == perfil | {"pases_min": 80.0}


def test_bus005_falta_la_liga_marca_el_campo_y_no_guarda(
    cliente_con_sesion: TestClient, session: Session, liga
):
    pedido = _perfil(liga)
    del pedido["liga_id"]

    respuesta = cliente_con_sesion.put(URL, json=pedido)

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "Para guardar el perfil falta elegir la liga.",
        "codigo": "validacion",
        "errores": [{"campo": "liga_id", "mensaje": "Falta elegir la liga."}],
    }
    assert _cantidad_de_perfiles(session) == 0


def test_bus005_faltan_posicion_y_liga(cliente_con_sesion: TestClient, liga):
    respuesta = cliente_con_sesion.put(URL, json={"edad_min": 20, "edad_max": 27})

    assert respuesta.json()["detalle"] == (
        "Para guardar el perfil falta elegir la posición y la liga."
    )
    assert [e["campo"] for e in respuesta.json()["errores"]] == ["posicion", "liga_id"]


def test_bus005_guardar_otro_reemplaza_al_anterior(
    cliente_con_sesion: TestClient, session: Session, liga
):
    cliente_con_sesion.put(URL, json=_perfil(liga, posicion="defensor"))

    respuesta = cliente_con_sesion.put(URL, json=_perfil(liga, posicion="delantero"))

    assert respuesta.status_code == 200
    assert _cantidad_de_perfiles(session) == 1
    assert cliente_con_sesion.get(URL).json()["posicion"] == "delantero"


def test_bus005_reemplazar_borra_los_opcionales_que_ya_no_vienen(
    cliente_con_sesion: TestClient, liga
):
    cliente_con_sesion.put(URL, json=_perfil(liga, pases_min=80))

    cliente_con_sesion.put(URL, json=_perfil(liga))

    assert cliente_con_sesion.get(URL).json()["pases_min"] is None


def test_bus005_sin_perfil_responde_404(cliente_con_sesion: TestClient):
    respuesta = cliente_con_sesion.get(URL)

    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "sin_perfil"


def test_bus005_liga_inexistente_responde_404(cliente_con_sesion: TestClient, liga):
    respuesta = cliente_con_sesion.put(URL, json=_perfil(liga, liga_id=999_999))

    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "liga_inexistente"


@pytest.mark.parametrize(
    "cambios",
    [
        {"edad_min": 30, "edad_max": 25},
        {"edad_min": 14},
        {"presupuesto_max_eur": 10_000},
        {"presupuesto_max_eur": 400_001},
        {"pases_min": 101},
        {"recuperaciones_min": 16},
        {"posicion": "lateral"},
    ],
)
def test_bus005_valores_fuera_de_rango_responden_422(
    cliente_con_sesion: TestClient, liga, cambios: dict
):
    respuesta = cliente_con_sesion.put(URL, json=_perfil(liga, **cambios))

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"


def test_bus005_cada_usuario_ve_solo_su_perfil(
    cliente_con_sesion: TestClient, session: Session, liga
):
    otro = crear_usuario(session)
    otro_cliente = TestClient(cliente_con_sesion.app)
    otro_cliente.cookies.set(NOMBRE_COOKIE_SESION, crear_token_sesion(otro.id))
    otro_cliente.put(URL, json=_perfil(liga, posicion="arquero"))

    assert cliente_con_sesion.get(URL).status_code == 404
    assert otro_cliente.get(URL).json()["posicion"] == "arquero"


def test_bus005_sin_sesion_responde_401(cliente: TestClient, liga):
    assert cliente.get(URL).status_code == 401
    assert cliente.put(URL, json=_perfil(liga)).status_code == 401
