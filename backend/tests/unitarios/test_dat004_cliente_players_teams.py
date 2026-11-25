"""DAT-004: el cliente de API-Football pide los clubes de un jugador (/players/teams)."""

import httpx
import pytest

from app.integraciones.cliente_api_football import ClienteApiFootball, ErrorApiFootball
from tests.api_football_falsa import ApiFootballFalsa, cargar_fixture

CLAVE = "clave-secreta-de-prueba"


@pytest.fixture
def api() -> ApiFootballFalsa:
    return ApiFootballFalsa()


@pytest.fixture
def cliente(api: ApiFootballFalsa) -> ClienteApiFootball:
    return ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=lambda _s: None)


def test_dat004_se_piden_los_clubes_del_jugador_por_su_id(api, cliente):
    api.responder("/players/teams", {"player": 6668}, cargar_fixture("players_teams_varios_clubes"))

    clubes = cliente.equipos_del_jugador(6668)

    assert len(clubes) == 6
    assert clubes[0]["team"]["name"] == "Deportivo Merlo"
    assert api.pedidos[0].url.path == "/players/teams"
    assert api.pedidos[0].url.params["player"] == "6668"
    assert api.pedidos[0].headers["x-apisports-key"] == CLAVE
    assert cliente.pedidos_usados == 1


def test_dat004_un_jugador_sin_clubes_devuelve_lista_vacia(api, cliente):
    sin_clubes = {**cargar_fixture("players_teams_un_solo_club"), "results": 0, "response": []}
    api.responder("/players/teams", {"player": 1}, sin_clubes)

    assert cliente.equipos_del_jugador(1) == []


def test_dat004_si_la_api_devuelve_errores_se_corta(api, cliente):
    api.responder(
        "/players/teams",
        {"player": 1},
        {"errors": {"requests": "limite"}, "response": [], "results": 0},
    )

    with pytest.raises(ErrorApiFootball):
        cliente.equipos_del_jugador(1)


# Límite por minuto: la trayectoria hace miles de pedidos seguidos desde Actions, más rápido que
# el plan. El cliente espera un minuto en lugar de cortar la corrida.
SEGUNDOS_POR_MINUTO = 60


def _con_headers(fixture: dict, **headers: str) -> httpx.Response:
    return httpx.Response(200, json=fixture, headers=headers)


def test_dat004_si_no_quedan_pedidos_en_el_minuto_espera_antes_del_siguiente(api):
    esperas: list[float] = []
    cliente = ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=esperas.append)
    club = cargar_fixture("players_teams_un_solo_club")
    api.responder(
        "/players/teams", {"player": 1}, _con_headers(club, **{"x-ratelimit-remaining": "0"})
    )
    api.responder("/players/teams", {"player": 2}, club)

    cliente.equipos_del_jugador(1)
    cliente.equipos_del_jugador(2)

    assert esperas == [SEGUNDOS_POR_MINUTO]
    assert cliente.pedidos_usados == 2


def test_dat004_si_quedan_pedidos_en_el_minuto_no_espera(api):
    esperas: list[float] = []
    cliente = ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=esperas.append)
    club = cargar_fixture("players_teams_un_solo_club")
    api.responder(
        "/players/teams", {"player": 1}, _con_headers(club, **{"x-ratelimit-remaining": "5"})
    )
    api.responder("/players/teams", {"player": 2}, club)

    cliente.equipos_del_jugador(1)
    cliente.equipos_del_jugador(2)

    assert esperas == []


def test_dat004_el_error_de_limite_por_minuto_espera_y_reintenta(api):
    esperas: list[float] = []
    cliente = ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=esperas.append)
    club = cargar_fixture("players_teams_un_solo_club")
    limite = {
        **club,
        "errors": {"rateLimit": "Too many requests. Your rate limit is 300 requests per minute."},
        "results": 0,
        "response": [],
    }
    api.responder("/players/teams", {"player": 1}, limite, club)

    clubes = cliente.equipos_del_jugador(1)

    assert clubes == club["response"]
    assert esperas == [SEGUNDOS_POR_MINUTO]
    assert cliente.pedidos_usados == 2


def test_dat004_el_limite_por_minuto_que_no_se_libera_termina_en_error(api):
    esperas: list[float] = []
    cliente = ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=esperas.append)
    limite = {"errors": {"rateLimit": "Too many requests."}, "results": 0, "response": []}
    api.responder("/players/teams", {"player": 1}, limite)

    with pytest.raises(ErrorApiFootball, match="por minuto"):
        cliente.equipos_del_jugador(1)

    assert esperas == [SEGUNDOS_POR_MINUTO] * 3
    assert cliente.pedidos_usados == 4
