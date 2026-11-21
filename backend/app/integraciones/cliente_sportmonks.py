"""Cliente HTTP de Sportmonks Football API v3 (DAT-003). Solo lo usa la sincronización.

Reintenta timeouts y errores 5xx con backoff. Si Sportmonks responde 429 (límite de pedidos por
hora y por entidad), espera lo que indique `Retry-After` (o `retry_after` en el cuerpo) y
reintenta. Cualquier otro 4xx es un error sin reintento (RN-025). El token va en el header
`Authorization`, no en la URL, y ningún mensaje de error lo incluye.
"""

import time
from collections.abc import Callable
from typing import Any

import httpx

URL_BASE = "https://api.sportmonks.com/v3/football"
# Los datos comunes (países, tipos) no cuelgan de /football
URL_CORE = "https://api.sportmonks.com/v3/core"
SEGUNDOS_TIMEOUT = 20
ESPERAS_REINTENTO_SEGUNDOS = (1, 2, 4)
# Una sincronización son más de mil pedidos: un corte de red de un par de minutos no tiene que
# tirar toda la corrida (el 16/11/2026 se perdió una a mitad de camino por un error de conexión)
ESPERAS_CONEXION_SEGUNDOS = (1, 2, 4, 10, 30, 60, 60)
# Sportmonks pagina de a 50 como máximo
RESULTADOS_POR_PAGINA = 50
# Un 429 puede traer una espera de casi una hora (la ventana del límite es de una hora)
MAXIMO_ESPERA_429_SEGUNDOS = 3600
ESPERA_429_POR_DEFECTO_SEGUNDOS = 60
REINTENTOS_429 = 3
# Cada respuesta trae el cupo que queda en la hora (`rate_limit.remaining`). Con menos que esto se
# espera a que se renueve, en lugar de chocar con un 429 en medio de una sincronización
CUPO_MINIMO_ANTES_DE_ESPERAR = 10


class ErrorSportmonks(Exception):
    """La API falló o se agotó el límite. El mensaje nunca lleva el token."""


class ClienteSportmonks:
    def __init__(
        self,
        token: str,
        *,
        transporte: httpx.BaseTransport | None = None,
        dormir: Callable[[float], None] = time.sleep,
        url_base: str = URL_BASE,
    ) -> None:
        self._token = token
        self._dormir = dormir
        self.pedidos_usados = 0
        self._paises: dict[int, str] | None = None
        self._http = httpx.Client(
            base_url=url_base,
            headers={"Authorization": token},
            timeout=SEGUNDOS_TIMEOUT,
            transport=transporte,
        )

    def __enter__(self) -> "ClienteSportmonks":
        return self

    def __exit__(self, *_excepcion) -> None:
        self._http.close()

    def paginar(self, ruta: str, parametros: dict[str, Any]) -> list[dict[str, Any]]:
        """Todas las páginas de un endpoint (RN-025: se piden todas antes de escribir)."""
        filas: list[dict[str, Any]] = []
        pagina = 1
        while True:
            datos = self.obtener(
                ruta, {**parametros, "page": pagina, "per_page": RESULTADOS_POR_PAGINA}
            )
            filas.extend(datos.get("data") or [])
            if not (datos.get("pagination") or {}).get("has_more"):
                return filas
            pagina += 1

    # Los pedidos para armar una liga (docs.sportmonks.com/v3). No existe una llamada por liga:
    # hay que pedir equipos, planteles y luego cada jugador (DAT-003, ADR-0011).

    def liga(self, id_liga: int) -> dict[str, Any]:
        """La liga con todas sus temporadas."""
        return self.obtener(f"/leagues/{id_liga}", {"include": "seasons"}).get("data") or {}

    def paises(self) -> dict[int, str]:
        """{id: nombre} de todos los países (unos 240). Se piden una sola vez por cliente."""
        if self._paises is None:
            filas = self.paginar(f"{URL_CORE}/countries", {})
            self._paises = {fila["id"]: fila["name"] for fila in filas if fila.get("name")}
        return self._paises

    def equipos_de_la_temporada(self, id_temporada: int) -> list[dict[str, Any]]:
        return self.paginar(f"/teams/seasons/{id_temporada}", {})

    def plantel(self, id_temporada: int, id_equipo: int) -> list[dict[str, Any]]:
        """Las filas del plantel, con `player_id` y `has_values` (si tiene estadísticas)."""
        ruta = f"/squads/seasons/{id_temporada}/teams/{id_equipo}"
        return self.obtener(ruta, {}).get("data") or []

    def jugador(self, id_jugador: int, id_temporada: int) -> dict[str, Any] | None:
        """El jugador con sus estadísticas de la temporada."""
        parametros = {
            "include": "statistics.details",
            "filters": f"playerStatisticSeasons:{id_temporada}",
        }
        return self.obtener(f"/players/{id_jugador}", parametros).get("data")

    def obtener(self, ruta: str, parametros: dict[str, Any]) -> dict[str, Any]:
        """GET con reintentos. Cada intento cuenta como un pedido."""
        descripcion = _describir(ruta, parametros)
        reintentos_429 = 0
        intento = 0
        while True:
            self.pedidos_usados += 1
            try:
                respuesta = self._http.get(ruta, params=parametros)
            except httpx.TimeoutException:
                motivo = f"timeout de {SEGUNDOS_TIMEOUT} segundos"
                esperas = ESPERAS_REINTENTO_SEGUNDOS
            except httpx.TransportError as error:
                motivo = f"error de conexión ({type(error).__name__})"
                esperas = ESPERAS_CONEXION_SEGUNDOS
            else:
                if respuesta.status_code == 429:
                    espera = _espera_del_429(respuesta)
                    if espera > MAXIMO_ESPERA_429_SEGUNDOS or reintentos_429 >= REINTENTOS_429:
                        raise ErrorSportmonks(
                            self._sin_token(
                                f"Sportmonks respondió HTTP 429 en {descripcion}: se agotó el "
                                "límite de pedidos."
                            )
                        )
                    reintentos_429 += 1
                    self._dormir(espera)
                    continue
                if respuesta.status_code < 500:
                    return self._validar(respuesta, descripcion)
                motivo = f"HTTP {respuesta.status_code}"
                esperas = ESPERAS_REINTENTO_SEGUNDOS
            if intento >= len(esperas):
                raise ErrorSportmonks(
                    self._sin_token(
                        f"Sportmonks falló en {descripcion} tras {intento + 1} intentos: {motivo}."
                    )
                )
            self._dormir(esperas[intento])
            intento += 1

    def _validar(self, respuesta: httpx.Response, descripcion: str) -> dict[str, Any]:
        if respuesta.is_error:
            raise ErrorSportmonks(
                self._sin_token(
                    f"Sportmonks respondió HTTP {respuesta.status_code} en {descripcion}."
                )
            )
        cuerpo = respuesta.json()
        self._esperar_si_queda_poco_cupo(cuerpo)
        return cuerpo

    def _esperar_si_queda_poco_cupo(self, cuerpo: Any) -> None:
        cupo = cuerpo.get("rate_limit") if isinstance(cuerpo, dict) else None
        if not isinstance(cupo, dict):
            return
        restante, segundos = cupo.get("remaining"), cupo.get("resets_in_seconds")
        if not isinstance(restante, int) or not isinstance(segundos, int | float):
            return
        if restante < CUPO_MINIMO_ANTES_DE_ESPERAR:
            self._dormir(min(float(segundos), MAXIMO_ESPERA_429_SEGUNDOS))

    def _sin_token(self, mensaje: str) -> str:
        return mensaje.replace(self._token, "***") if self._token else mensaje


def _espera_del_429(respuesta: httpx.Response) -> float:
    """Segundos que pide esperar: el header `Retry-After`, o `retry_after` del cuerpo."""
    encabezado = respuesta.headers.get("Retry-After")
    if encabezado is not None and encabezado.isdigit():
        return float(encabezado)
    try:
        cuerpo = respuesta.json()
    except ValueError:
        cuerpo = {}
    valor = cuerpo.get("retry_after") if isinstance(cuerpo, dict) else None
    if isinstance(valor, int | float) and not isinstance(valor, bool) and valor >= 0:
        return float(valor)
    return float(ESPERA_429_POR_DEFECTO_SEGUNDOS)


def _describir(ruta: str, parametros: dict[str, Any]) -> str:
    return f"{ruta}?" + "&".join(f"{nombre}={valor}" for nombre, valor in parametros.items())
