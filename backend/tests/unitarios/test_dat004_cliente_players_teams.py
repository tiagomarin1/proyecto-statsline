"""DAT-004: el cliente de API-Football pide los clubes de un jugador (/players/teams)."""

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
