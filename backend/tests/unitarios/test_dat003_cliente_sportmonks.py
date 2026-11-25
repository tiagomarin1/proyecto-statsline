"""DAT-003: cliente de Sportmonks (paginado, reintentos, límite de pedidos y token oculto)."""

import json

import httpx
import pytest

from app.integraciones.cliente_sportmonks import ClienteSportmonks, ErrorSportmonks

TOKEN = "token-secreto-de-prueba"


def _pagina(datos: list, *, pagina: int, hay_mas: bool) -> dict:
    return {
        "data": datos,
        "pagination": {
            "count": len(datos),
            "per_page": 50,
            "current_page": pagina,
            "has_more": hay_mas,
        },
    }


class SportmonksFalsa:
    """Responde en orden lo que se le registró para cada ruta; la última respuesta se repite."""

    def __init__(self) -> None:
        self.pedidos: list[httpx.Request] = []
        self._respuestas: dict[str, list] = {}

    def responder(self, ruta: str, *respuestas) -> None:
        self._respuestas[ruta] = list(respuestas)

    def transporte(self) -> httpx.MockTransport:
        return httpx.MockTransport(self._atender)

    def _atender(self, pedido: httpx.Request) -> httpx.Response:
        self.pedidos.append(pedido)
        cola = self._respuestas[pedido.url.path]
        respuesta = cola.pop(0) if len(cola) > 1 else cola[0]
        if isinstance(respuesta, Exception):
            raise respuesta
        if isinstance(respuesta, httpx.Response):
            return respuesta
        if isinstance(respuesta, int):
            return httpx.Response(respuesta, json={"message": "error de prueba"})
        return httpx.Response(200, json=respuesta)


@pytest.fixture
def api() -> SportmonksFalsa:
    return SportmonksFalsa()


@pytest.fixture
def esperas() -> list[float]:
    return []


@pytest.fixture
def cliente(api: SportmonksFalsa, esperas: list[float]) -> ClienteSportmonks:
    return ClienteSportmonks(TOKEN, transporte=api.transporte(), dormir=esperas.append)


def test_dat003_el_token_va_en_el_header_y_no_en_la_url(api, cliente):
    api.responder("/v3/football/seasons", _pagina([{"id": 1}], pagina=1, hay_mas=False))

    cliente.obtener("/seasons", {})

    pedido = api.pedidos[0]
    assert pedido.headers["Authorization"] == TOKEN
    assert pedido.url.host == "api.sportmonks.com"
    assert TOKEN not in str(pedido.url)


def test_dat003_se_recorren_todas_las_paginas_mientras_haya_mas(api, cliente):
    api.responder(
        "/v3/football/statistics/seasons/players/25001",
        _pagina([{"id": 1}, {"id": 2}], pagina=1, hay_mas=True),
        _pagina([{"id": 3}], pagina=2, hay_mas=True),
        _pagina([{"id": 4}], pagina=3, hay_mas=False),
    )

    filas = cliente.paginar("/statistics/seasons/players/25001", {"include": "player;team"})

    assert [fila["id"] for fila in filas] == [1, 2, 3, 4]
    assert [p.url.params["page"] for p in api.pedidos] == ["1", "2", "3"]
    assert all(p.url.params["per_page"] == "50" for p in api.pedidos)
    assert all(p.url.params["include"] == "player;team" for p in api.pedidos)
    assert cliente.pedidos_usados == 3


def test_dat003_un_pedido_sin_datos_devuelve_lista_vacia(api, cliente):
    api.responder("/v3/football/seasons", _pagina([], pagina=1, hay_mas=False))

    assert cliente.paginar("/seasons", {}) == []


def test_dat003_un_error_500_se_reintenta_con_backoff(api, cliente, esperas):
    api.responder("/v3/football/seasons", 500, 503, _pagina([{"id": 7}], pagina=1, hay_mas=False))

    assert cliente.paginar("/seasons", {}) == [{"id": 7}]
    assert esperas == [1, 2]
    assert cliente.pedidos_usados == 3


def test_dat003_tres_errores_seguidos_cortan_con_un_mensaje_sin_el_token(api, cliente, esperas):
    api.responder("/v3/football/seasons", 500)

    with pytest.raises(ErrorSportmonks) as error:
        cliente.paginar("/seasons", {})

    assert "/seasons" in str(error.value)
    assert TOKEN not in str(error.value)
    assert esperas == [1, 2, 4]
    assert cliente.pedidos_usados == 4


def test_dat003_un_timeout_se_reintenta(api, cliente, esperas):
    api.responder(
        "/v3/football/seasons",
        httpx.ReadTimeout("lento"),
        _pagina([{"id": 1}], pagina=1, hay_mas=False),
    )

    assert cliente.paginar("/seasons", {}) == [{"id": 1}]
    assert esperas == [1]


def test_dat003_un_error_de_cliente_no_se_reintenta(api, cliente, esperas):
    api.responder("/v3/football/seasons", 401)

    with pytest.raises(ErrorSportmonks) as error:
        cliente.paginar("/seasons", {})

    assert "401" in str(error.value)
    assert esperas == []
    assert cliente.pedidos_usados == 1


def test_dat003_un_429_espera_el_tiempo_que_indica_el_header_y_reintenta(api, cliente, esperas):
    limite = httpx.Response(429, headers={"Retry-After": "90"}, json={"message": "Too Many"})
    api.responder("/v3/football/seasons", limite, _pagina([{"id": 1}], pagina=1, hay_mas=False))

    assert cliente.paginar("/seasons", {}) == [{"id": 1}]
    assert esperas == [90]


def test_dat003_un_429_usa_retry_after_del_cuerpo_si_no_hay_header(api, cliente, esperas):
    limite = httpx.Response(429, json={"message": "Too Many", "retry_after": 45})
    api.responder("/v3/football/seasons", limite, _pagina([{"id": 1}], pagina=1, hay_mas=False))

    cliente.paginar("/seasons", {})

    assert esperas == [45]


def test_dat003_si_el_429_pide_esperar_demasiado_se_trata_como_error(api, cliente, esperas):
    api.responder(
        "/v3/football/seasons",
        httpx.Response(429, headers={"Retry-After": "7200"}, json={"message": "Too Many"}),
    )

    with pytest.raises(ErrorSportmonks) as error:
        cliente.paginar("/seasons", {})

    assert "429" in str(error.value)
    assert esperas == []


def test_dat003_un_429_que_no_cede_corta_despues_de_reintentar(api, cliente, esperas):
    api.responder(
        "/v3/football/seasons",
        httpx.Response(429, headers={"Retry-After": "10"}, json={"message": "Too Many"}),
    )

    with pytest.raises(ErrorSportmonks):
        cliente.paginar("/seasons", {})

    assert esperas == [10, 10, 10]


def test_dat003_si_el_token_aparece_en_la_respuesta_no_se_filtra_en_el_error(api, cliente):
    cuerpo = json.dumps({"message": f"token invalido {TOKEN}"})
    api.responder("/v3/football/seasons", httpx.Response(403, content=cuerpo))

    with pytest.raises(ErrorSportmonks) as error:
        cliente.paginar("/seasons", {})

    assert TOKEN not in str(error.value)


def test_dat003_los_pedidos_de_una_liga_usan_las_rutas_documentadas():
    rutas: list[tuple[str, dict]] = []

    def responder(pedido: httpx.Request) -> httpx.Response:
        rutas.append((pedido.url.path, dict(pedido.url.params)))
        return httpx.Response(200, json={"data": [], "pagination": {"has_more": False}})

    with ClienteSportmonks("t", transporte=httpx.MockTransport(responder)) as cliente:
        cliente.liga(645)
        cliente.equipos_de_la_temporada(26809)
        cliente.plantel(26809, 8378)
        cliente.jugador(37, 26809)

    assert [ruta for ruta, _ in rutas] == [
        "/v3/football/leagues/645",
        "/v3/football/teams/seasons/26809",
        "/v3/football/squads/seasons/26809/teams/8378",
        "/v3/football/players/37",
    ]
    assert rutas[0][1] == {"include": "seasons"}
    assert rutas[3][1] == {
        "include": "statistics.details",
        "filters": "playerStatisticSeasons:26809",
    }


def test_dat003_una_caida_de_conexion_espera_mas_antes_de_rendirse(api, cliente, esperas):
    # una sincronización de Sportmonks son más de mil pedidos: un corte de red de un minuto o dos
    # no tiene que tirar toda la corrida
    api.responder(
        "/v3/football/seasons",
        *[httpx.ConnectError("sin red")] * 6,
        _pagina([{"id": 1}], pagina=1, hay_mas=False),
    )

    assert cliente.paginar("/seasons", {}) == [{"id": 1}]
    assert esperas == [1, 2, 4, 10, 30, 60]


def test_dat003_si_la_conexion_sigue_caida_corta_con_un_mensaje_sin_el_token(api, cliente, esperas):
    api.responder("/v3/football/seasons", httpx.ConnectError("sin red"))

    with pytest.raises(ErrorSportmonks) as error:
        cliente.paginar("/seasons", {})

    assert "conexión" in str(error.value)
    assert TOKEN not in str(error.value)
    assert esperas == [1, 2, 4, 10, 30, 60, 60]


def _con_cupo(restante: int, segundos: int = 120) -> dict:
    return {
        "data": [{"id": 1}],
        "pagination": {"has_more": False},
        "rate_limit": {
            "resets_in_seconds": segundos,
            "remaining": restante,
            "requested_entity": "Player",
        },
    }


def test_dat003_si_queda_poco_cupo_espera_a_que_se_renueve_antes_del_proximo_pedido(
    api, cliente, esperas
):
    api.responder("/v3/football/seasons", _con_cupo(restante=5, segundos=120))

    cliente.paginar("/seasons", {})

    assert esperas == [120]


def test_dat003_con_cupo_de_sobra_no_espera(api, cliente, esperas):
    api.responder("/v3/football/seasons", _con_cupo(restante=1500))

    cliente.paginar("/seasons", {})

    assert esperas == []


def test_dat003_una_espera_por_cupo_nunca_pasa_de_una_hora(api, cliente, esperas):
    api.responder("/v3/football/seasons", _con_cupo(restante=0, segundos=99999))

    cliente.paginar("/seasons", {})

    assert esperas == [3600]


def test_dat003_los_paises_se_piden_una_sola_vez_y_se_indexan_por_id():
    pedidos: list[str] = []

    def responder(pedido: httpx.Request) -> httpx.Response:
        pedidos.append(pedido.url.path)
        pagina = int(pedido.url.params["page"])
        datos = (
            [{"id": 44, "name": "Argentina"}] if pagina == 1 else [{"id": 858, "name": "Uruguay"}]
        )
        return httpx.Response(200, json={"data": datos, "pagination": {"has_more": pagina == 1}})

    with ClienteSportmonks("t", transporte=httpx.MockTransport(responder)) as cliente:
        primero = cliente.paises()
        segundo = cliente.paises()

    assert primero == {44: "Argentina", 858: "Uruguay"}
    assert segundo is primero
    assert pedidos == ["/v3/core/countries", "/v3/core/countries"]
