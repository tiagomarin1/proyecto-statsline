"""Sportmonks falsa para los tests: arma respuestas con la forma real de la API (grabadas el
16/11/2026 con la prueba de 14 días, pero con jugadores y equipos inventados) y las sirve con
httpx.MockTransport. Los tests nunca le pegan a la API real (TESTING_STRATEGY.md).
"""

import httpx

# Tipos de estadística de jugador (IDs de `player-statistics`)
RATING = 118


def estadisticas(**tipos) -> list[dict]:
    """Los `details` de una fila a partir de {t<id de tipo>: valor}. El rating lleva `average`."""
    detalles = []
    for nombre, valor in tipos.items():
        id_tipo = int(nombre.removeprefix("t"))
        clave = "average" if id_tipo == RATING else "total"
        detalles.append({"type_id": id_tipo, "value": {clave: valor}})
    return detalles


def fila(
    id_equipo: int, id_temporada: int, detalles: list[dict], posicion: int | None = 26
) -> dict:
    return {
        "player_id": 0,
        "team_id": id_equipo,
        "season_id": id_temporada,
        "has_values": bool(detalles),
        "position_id": posicion,
        "details": detalles,
    }


def jugador(
    id_jugador: int,
    nombre: str,
    *,
    nacimiento: str | None = "1999-03-15",
    posicion: int | None = 26,
    filas: list[dict] | None = None,
) -> dict:
    """Un jugador como lo devuelve /players/{id}?include=statistics.details."""
    primero, _, resto = nombre.partition(" ")
    return {
        "id": id_jugador,
        "position_id": posicion,
        "nationality_id": 44,
        "name": nombre,
        "common_name": f"{primero[:1]}.{resto}",
        "firstname": primero,
        "lastname": resto or None,
        "display_name": nombre,
        "date_of_birth": nacimiento,
        "statistics": [{**f, "player_id": id_jugador} for f in filas or []],
    }


def equipo(id_equipo: int, nombre: str) -> dict:
    return {"id": id_equipo, "name": nombre}


def liga(id_liga: int, temporadas: dict[int, str]) -> dict:
    return {
        "id": id_liga,
        "seasons": [{"id": id_, "name": nombre} for id_, nombre in temporadas.items()],
    }


def plantel(id_temporada: int, id_equipo: int, jugadores: dict[int, bool]) -> list[dict]:
    """El plantel de un equipo: {id de jugador: tiene estadísticas}."""
    return [
        {
            "player_id": id_,
            "team_id": id_equipo,
            "season_id": id_temporada,
            "has_values": con_valores,
            "position_id": 26,
        }
        for id_, con_valores in jugadores.items()
    ]


class SportmonksFalsa:
    """Registra respuestas por ruta y guarda los pedidos que recibió."""

    def __init__(self) -> None:
        self.pedidos: list[httpx.Request] = []
        self._respuestas: dict[str, list] = {}
        self.responder(
            "/v3/core/countries",
            {"data": [{"id": 44, "name": "Argentina"}], "pagination": {"has_more": False}},
        )

    def responder(self, ruta: str, *respuestas) -> None:
        """Cada respuesta es el JSON de un 200 (dict), un código HTTP (int) o una excepción.
        Con varias, se usan en orden y la última se repite."""
        self._respuestas[ruta] = list(respuestas)

    def responder_liga(self, datos_liga: dict) -> None:
        self.responder(f"/v3/football/leagues/{datos_liga['id']}", {"data": datos_liga})

    def responder_equipos(self, id_temporada: int, equipos: list[dict]) -> None:
        pagina = {"data": equipos, "pagination": {"has_more": False}}
        self.responder(f"/v3/football/teams/seasons/{id_temporada}", pagina)

    def responder_plantel(self, id_temporada: int, id_equipo: int, filas: list[dict]) -> None:
        ruta = f"/v3/football/squads/seasons/{id_temporada}/teams/{id_equipo}"
        self.responder(ruta, {"data": filas})

    def responder_jugador(self, datos_jugador: dict) -> None:
        self.responder(f"/v3/football/players/{datos_jugador['id']}", {"data": datos_jugador})

    def transporte(self) -> httpx.MockTransport:
        return httpx.MockTransport(self._atender)

    def pedidos_a(self, fragmento: str) -> list[httpx.Request]:
        return [p for p in self.pedidos if fragmento in p.url.path]

    def _atender(self, pedido: httpx.Request) -> httpx.Response:
        self.pedidos.append(pedido)
        ruta = pedido.url.path
        if ruta not in self._respuestas:
            raise AssertionError(f"Pedido no esperado a la API falsa: {pedido.url}")
        pendientes = self._respuestas[ruta]
        respuesta = pendientes.pop(0) if len(pendientes) > 1 else pendientes[0]
        if isinstance(respuesta, Exception):
            raise respuesta
        if isinstance(respuesta, int):
            return httpx.Response(respuesta, json={"message": "error del servidor"})
        return httpx.Response(200, json=respuesta)
