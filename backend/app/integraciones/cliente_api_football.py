"""Cliente HTTP de API-Football v3 (INTEGRACIONES_EXTERNAS.md). Solo lo usa la sincronización.

Reintenta timeouts y errores 5xx con backoff; un `errors` no vacío, un 4xx o el cupo por debajo
del mínimo son errores sin reintento (RN-025). Ningún mensaje de error incluye la clave.
"""

import time
from collections.abc import Callable
from typing import Any

import httpx

URL_BASE = "https://v3.football.api-sports.io"
HEADER_CLAVE = "x-apisports-key"
HEADER_PEDIDOS_RESTANTES = "x-ratelimit-requests-remaining"
SEGUNDOS_TIMEOUT = 10
ESPERAS_REINTENTO_SEGUNDOS = (1, 2, 4)
MINIMO_PEDIDOS_RESTANTES = 100


class ErrorApiFootball(Exception):
    """La API falló, respondió con `errors` o no queda cupo. El mensaje nunca lleva la clave."""


class ClienteApiFootball:
    def __init__(
        self,
        clave: str,
        *,
        transporte: httpx.BaseTransport | None = None,
        dormir: Callable[[float], None] = time.sleep,
        url_base: str = URL_BASE,
    ) -> None:
        self._clave = clave
        self._dormir = dormir
        self._pedidos_restantes: int | None = None
        self.pedidos_usados = 0
        self._http = httpx.Client(
            base_url=url_base,
            headers={HEADER_CLAVE: clave},
            timeout=SEGUNDOS_TIMEOUT,
            transport=transporte,
        )

    def __enter__(self) -> "ClienteApiFootball":
        return self

    def __exit__(self, *_excepcion) -> None:
        self._http.close()

    def temporada_actual(self, id_liga: int) -> int:
        """Año de la temporada que la API marca como actual (`/leagues?id=X&current=true`)."""
        datos = self.obtener("/leagues", {"id": id_liga, "current": "true"})
        temporadas = [
            temporada["year"]
            for liga in datos["response"]
            for temporada in liga.get("seasons", [])
            if temporada.get("current")
        ]
        if not temporadas:
            raise ErrorApiFootball(
                f"API-Football no informa la temporada actual de la liga {id_liga}."
            )
        return max(temporadas)

    def jugadores(self, id_liga: int, temporada: int) -> list[dict[str, Any]]:
        """Todas las páginas de `/players` de una liga y temporada (RN-025: antes de escribir)."""
        jugadores: list[dict[str, Any]] = []
        pagina, total_paginas = 1, 1
        while pagina <= total_paginas:
            datos = self.obtener(
                "/players", {"league": id_liga, "season": temporada, "page": pagina}
            )
            jugadores.extend(datos["response"])
            total_paginas = datos.get("paging", {}).get("total") or 1
            pagina += 1
        return jugadores

    def obtener(self, ruta: str, parametros: dict[str, Any]) -> dict[str, Any]:
        """GET con reintentos. Cada intento cuenta como un pedido del cupo."""
        descripcion = _describir(ruta, parametros)
        intentos = len(ESPERAS_REINTENTO_SEGUNDOS) + 1
        for intento in range(intentos):
            self._verificar_cupo(descripcion)
            self.pedidos_usados += 1
            try:
                respuesta = self._http.get(ruta, params=parametros)
            except httpx.TimeoutException:
                motivo = f"timeout de {SEGUNDOS_TIMEOUT} segundos"
            except httpx.TransportError as error:
                motivo = f"error de conexión ({type(error).__name__})"
            else:
                self._leer_cupo(respuesta)
                if respuesta.status_code < 500:
                    return self._validar(respuesta, descripcion)
                motivo = f"HTTP {respuesta.status_code}"
            if intento < intentos - 1:
                self._dormir(ESPERAS_REINTENTO_SEGUNDOS[intento])
        raise ErrorApiFootball(
            self._sin_clave(
                f"API-Football falló en {descripcion} tras {intentos} intentos: {motivo}."
            )
        )

    def _validar(self, respuesta: httpx.Response, descripcion: str) -> dict[str, Any]:
        if respuesta.is_error:
            raise ErrorApiFootball(
                self._sin_clave(
                    f"API-Football respondió HTTP {respuesta.status_code} en {descripcion}."
                )
            )
        datos = respuesta.json()
        # La API devuelve [] cuando no hay errores y un dict {campo: mensaje} cuando los hay
        if datos.get("errors"):
            raise ErrorApiFootball(
                self._sin_clave(
                    f"API-Football devolvió errores en {descripcion}: {datos['errors']}"
                )
            )
        return datos

    def _leer_cupo(self, respuesta: httpx.Response) -> None:
        restantes = respuesta.headers.get(HEADER_PEDIDOS_RESTANTES)
        if restantes is not None and restantes.isdigit():
            self._pedidos_restantes = int(restantes)

    def _verificar_cupo(self, descripcion: str) -> None:
        if (
            self._pedidos_restantes is not None
            and self._pedidos_restantes < MINIMO_PEDIDOS_RESTANTES
        ):
            raise ErrorApiFootball(
                f"Se frenó antes de {descripcion}: quedan {self._pedidos_restantes} pedidos "
                f"del cupo diario y el mínimo es {MINIMO_PEDIDOS_RESTANTES}."
            )

    def _sin_clave(self, mensaje: str) -> str:
        return mensaje.replace(self._clave, "***") if self._clave else mensaje


def _describir(ruta: str, parametros: dict[str, Any]) -> str:
    return f"{ruta}?" + "&".join(f"{nombre}={valor}" for nombre, valor in parametros.items())
