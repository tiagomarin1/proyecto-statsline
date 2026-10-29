"""DAT-001: cliente de API-Football (paginado, reintentos, errores y cupo), con fixtures reales."""

import httpx
import pytest

from app.integraciones.cliente_api_football import ClienteApiFootball, ErrorApiFootball
from tests.api_football_falsa import (
    ApiFootballFalsa,
    cargar_fixture,
    partir_en_paginas,
    respuesta_liga,
)

CLAVE = "clave-secreta-de-prueba"
LIGA_PROFESIONAL = 128
PRIMERA_NACIONAL = 129
TEMPORADA = 2026


@pytest.fixture
def api() -> ApiFootballFalsa:
    return ApiFootballFalsa()


@pytest.fixture
def esperas() -> list[float]:
    return []


@pytest.fixture
def cliente_api(api: ApiFootballFalsa, esperas: list[float]) -> ClienteApiFootball:
    return ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=esperas.append)


def _paginas_liga_completa(cantidad: int = 2) -> list[dict]:
    return partir_en_paginas(cargar_fixture("players_liga_completa_128_2026_p1"), cantidad)


def test_dat001_cada_pedido_lleva_la_clave_en_el_header(api, cliente_api):
    api.responder_jugadores(LIGA_PROFESIONAL, TEMPORADA, _paginas_liga_completa(1))

    cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert api.pedidos[0].headers["x-apisports-key"] == CLAVE
    assert api.pedidos[0].url.host == "v3.football.api-sports.io"


def test_dat001_se_recorren_todas_las_paginas_de_players(api, cliente_api):
    paginas = _paginas_liga_completa(3)
    api.responder_jugadores(LIGA_PROFESIONAL, TEMPORADA, paginas)

    jugadores = cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert len(jugadores) == 20
    assert [pedido.url.params["page"] for pedido in api.pedidos] == ["1", "2", "3"]
    assert cliente_api.pedidos_usados == 3


def test_dat001_una_liga_sin_jugadores_devuelve_lista_vacia(api, cliente_api):
    sin_datos = cargar_fixture("players_liga_sin_datos_132_2026_p1")
    api.responder_jugadores(132, TEMPORADA, [sin_datos])

    assert cliente_api.jugadores(132, TEMPORADA) == []


def test_dat001_un_error_500_se_reintenta_con_backoff(api, cliente_api, esperas):
    pagina = _paginas_liga_completa(1)[0]
    parametros = {"league": LIGA_PROFESIONAL, "season": TEMPORADA, "page": 1}
    api.responder("/players", parametros, 500, 503, pagina)

    jugadores = cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert len(jugadores) == 20
    assert esperas == [1, 2]
    assert cliente_api.pedidos_usados == 3


def test_dat001_un_timeout_se_reintenta(api, cliente_api, esperas):
    pagina = _paginas_liga_completa(1)[0]
    parametros = {"league": LIGA_PROFESIONAL, "season": TEMPORADA, "page": 1}
    api.responder("/players", parametros, httpx.ReadTimeout("tardó demasiado"), pagina)

    assert len(cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)) == 20
    assert esperas == [1]


def test_dat001_si_la_pagina_sigue_fallando_tras_3_reintentos_es_error(api, cliente_api, esperas):
    pagina1, _ = _paginas_liga_completa(2)
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, pagina1)
    api.responder("/players", {"league": 128, "season": 2026, "page": 2}, 500)

    with pytest.raises(ErrorApiFootball) as error:
        cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert esperas == [1, 2, 4]
    assert cliente_api.pedidos_usados == 5
    assert "page=2" in str(error.value)
    assert "500" in str(error.value)
    assert CLAVE not in str(error.value)


def test_dat001_errors_no_vacio_es_error_y_no_se_reintenta(api, cliente_api, esperas):
    con_errores = cargar_fixture("players_error_sin_temporada")
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, con_errores)

    with pytest.raises(ErrorApiFootball) as error:
        cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert "The Season field is required." in str(error.value)
    assert esperas == []
    assert cliente_api.pedidos_usados == 1


def test_dat001_cupo_agotado_en_errors_es_error(api, cliente_api):
    cupo_agotado = {
        **cargar_fixture("players_error_sin_temporada"),
        "errors": {"requests": "You have reached the request limit for the day."},
    }
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, cupo_agotado)

    with pytest.raises(ErrorApiFootball, match="request limit"):
        cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)


def test_dat001_un_error_4xx_no_se_reintenta(api, cliente_api, esperas):
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, 401)

    with pytest.raises(ErrorApiFootball, match="401"):
        cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert esperas == []


def test_dat001_se_frena_si_quedan_menos_de_100_pedidos(api, cliente_api):
    pagina1, pagina2 = _paginas_liga_completa(2)
    poco_cupo = httpx.Response(200, json=pagina1, headers={"x-ratelimit-requests-remaining": "99"})
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, poco_cupo)
    api.responder("/players", {"league": 128, "season": 2026, "page": 2}, pagina2)

    with pytest.raises(ErrorApiFootball, match="cupo"):
        cliente_api.jugadores(LIGA_PROFESIONAL, TEMPORADA)

    assert cliente_api.pedidos_usados == 1


def test_dat001_temporadas_de_una_liga_de_la_mas_nueva_a_la_mas_vieja(api, cliente_api):
    api.responder("/leagues", {"id": PRIMERA_NACIONAL}, respuesta_liga(PRIMERA_NACIONAL))

    temporadas = cliente_api.temporadas(PRIMERA_NACIONAL)

    assert temporadas[:3] == [2026, 2025, 2024]
    assert temporadas == sorted(set(temporadas), reverse=True)


def test_dat001_una_liga_sin_temporadas_es_error(api, cliente_api):
    sin_temporadas = respuesta_liga(PRIMERA_NACIONAL)
    sin_temporadas["response"] = []
    api.responder("/leagues", {"id": PRIMERA_NACIONAL}, sin_temporadas)

    with pytest.raises(ErrorApiFootball, match="temporadas"):
        cliente_api.temporadas(PRIMERA_NACIONAL)
