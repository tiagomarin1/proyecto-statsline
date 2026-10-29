"""API-Football falsa para los tests: sirve los fixtures reales con httpx.MockTransport.

Los tests nunca le pegan a la API real (TESTING_STRATEGY.md). Cada pedido se responde con lo
que se registró para su ruta y sus parámetros; si se registraron varias respuestas, se usan en
orden y la última se repite.
"""

import copy
import json
from pathlib import Path

import httpx

DIRECTORIO_FIXTURES = Path(__file__).parent / "fixtures" / "api_football"
PEDIDOS_RESTANTES_POR_DEFECTO = "7000"


def cargar_fixture(nombre: str) -> dict:
    return json.loads((DIRECTORIO_FIXTURES / f"{nombre}.json").read_text(encoding="utf-8"))


def respuesta_liga(id_liga: int) -> dict:
    """Respuesta de /leagues?id=X (con todas sus temporadas), armada con la liga real de
    leagues_argentina."""
    argentina = cargar_fixture("leagues_argentina")
    liga = next(r for r in argentina["response"] if r["league"]["id"] == id_liga)
    return {**argentina, "parameters": {"id": str(id_liga)}, "results": 1, "response": [liga]}


def partir_en_paginas(fixture: dict, cantidad: int) -> list[dict]:
    """Reparte los jugadores de una página real en `cantidad` páginas, con su `paging`."""
    jugadores = fixture["response"]
    tamano = -(-len(jugadores) // cantidad)
    paginas = []
    for numero in range(1, cantidad + 1):
        pagina = copy.deepcopy(fixture)
        pagina["response"] = copy.deepcopy(jugadores[(numero - 1) * tamano : numero * tamano])
        pagina["results"] = len(pagina["response"])
        pagina["paging"] = {"current": numero, "total": cantidad}
        pagina["parameters"]["page"] = str(numero)
        paginas.append(pagina)
    return paginas


class ApiFootballFalsa:
    """Registra respuestas por ruta y parámetros, y guarda los pedidos que recibió."""

    def __init__(self) -> None:
        self.pedidos: list[httpx.Request] = []
        self._respuestas: dict[tuple[str, frozenset], list] = {}

    def responder(self, ruta: str, parametros: dict, *respuestas) -> None:
        """Cada respuesta puede ser un dict (200 con ese JSON), un código HTTP, un
        httpx.Response armado o una excepción para lanzar (por ejemplo, un timeout)."""
        self._respuestas[self._clave(ruta, parametros)] = list(respuestas)

    def responder_jugadores(self, id_liga: int, temporada: int, paginas: list[dict]) -> None:
        for numero, pagina in enumerate(paginas, start=1):
            parametros = {"league": id_liga, "season": temporada, "page": numero}
            self.responder("/players", parametros, pagina)

    def transporte(self) -> httpx.MockTransport:
        return httpx.MockTransport(self._atender)

    @staticmethod
    def _clave(ruta: str, parametros: dict) -> tuple[str, frozenset]:
        return ruta, frozenset((nombre, str(valor)) for nombre, valor in parametros.items())

    def _atender(self, pedido: httpx.Request) -> httpx.Response:
        self.pedidos.append(pedido)
        clave = self._clave(pedido.url.path, dict(pedido.url.params))
        if clave not in self._respuestas:
            raise AssertionError(f"Pedido no esperado a la API falsa: {pedido.url}")
        pendientes = self._respuestas[clave]
        respuesta = pendientes.pop(0) if len(pendientes) > 1 else pendientes[0]
        if isinstance(respuesta, Exception):
            raise respuesta
        if isinstance(respuesta, httpx.Response):
            return respuesta
        if isinstance(respuesta, int):
            return httpx.Response(respuesta, json={"message": "error del servidor"})
        return httpx.Response(
            200,
            json=respuesta,
            headers={"x-ratelimit-requests-remaining": PEDIDOS_RESTANTES_POR_DEFECTO},
        )
