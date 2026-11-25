"""Explora Sportmonks durante la prueba de 14 días y graba las respuestas (DAT-003). Se corre con:

    python -m app.sincronizacion.explorar_sportmonks [--salida <carpeta>] [--equipos-por-liga N]
        [--jugadores-por-liga N] [--listado-general]

No escribe en la base. Por cada liga de la suscripción prueba los pedidos que documenta
Sportmonks (docs.sportmonks.com/v3) para armar una liga: las temporadas, los equipos de la
temporada, el plantel de los primeros N equipos y las estadísticas de sus jugadores. Con
--listado-general prueba también una página de /players (el 16/11/2026 se vio que ese listado no
filtra por temporada y devuelve a los mismos jugadores en todas las ligas). Guarda cada respuesta
en una carpeta (el token viaja en un header, así que no queda en lo grabado) y escribe
`resumen.json` con lo que hace falta confirmar: cuántos jugadores traen cada dato, qué IDs de
posición aparecen y cuántos pedidos se usaron.
Con esas grabaciones se reemplazan los fixtures a mano de `tests/fixtures/sportmonks/`.
"""

import argparse
import json
import logging
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from app.config import obtener_configuracion
from app.integraciones.cliente_sportmonks import ClienteSportmonks, ErrorSportmonks
from app.sincronizacion.mapeo_sportmonks import (
    TIPO_DUELOS_TOTALES,
    TIPO_INTERCEPCIONES,
    TIPO_MINUTOS,
    TIPO_PASES,
    TIPO_PASES_ACERTADOS,
    TIPO_RATING,
)

logger = logging.getLogger(__name__)

JUGADORES_POR_LIGA_POR_DEFECTO = 5
EQUIPOS_POR_LIGA_POR_DEFECTO = 1
# Tipo de estadística que Sportmonks trae ya calculado como porcentaje de pases (a confirmar)
TIPO_PORCENTAJE_PASES = 1584
CARPETA_POR_DEFECTO = Path("grabaciones_sportmonks")
INCLUDE_ESTADISTICAS = "statistics.details"
# Dato del resumen -> tipo de estadística de Sportmonks (IDs de `player-statistics`)
TIPOS_A_CONTAR = {
    "con_minutos": TIPO_MINUTOS,
    "con_pases": TIPO_PASES,
    "con_pases_acertados": TIPO_PASES_ACERTADOS,
    "con_porcentaje_de_pases": TIPO_PORCENTAJE_PASES,
    "con_duelos": TIPO_DUELOS_TOTALES,
    "con_intercepciones": TIPO_INTERCEPCIONES,
    "con_rating": TIPO_RATING,
}


def resumir_jugadores(jugadores: list[dict[str, Any]]) -> dict[str, Any]:
    """Cuántos jugadores traen cada dato y qué IDs de posición aparecen.

    Un jugador cuenta para un dato si alguna de sus filas de estadísticas lo trae.
    """
    resumen: dict[str, Any] = {"jugadores": len(jugadores)}
    for nombre in TIPOS_A_CONTAR:
        resumen[nombre] = 0
    resumen["con_fecha_de_nacimiento"] = 0
    posiciones: Counter[str] = Counter()
    for jugador in jugadores:
        tipos = {
            detalle.get("type_id")
            for fila in jugador.get("statistics") or []
            for detalle in fila.get("details") or []
        }
        for nombre, tipo in TIPOS_A_CONTAR.items():
            if tipo in tipos:
                resumen[nombre] += 1
        if jugador.get("date_of_birth"):
            resumen["con_fecha_de_nacimiento"] += 1
        posicion = jugador.get("position_id")
        posiciones["sin_posicion" if posicion is None else str(posicion)] += 1
    resumen["posiciones"] = dict(posiciones)
    return resumen


def explorar(
    cliente: ClienteSportmonks,
    salida: Path,
    *,
    jugadores_por_liga: int,
    equipos_por_liga: int = EQUIPOS_POR_LIGA_POR_DEFECTO,
    listado_general: bool = False,
) -> dict[str, Any]:
    """Recorre las ligas de la suscripción, graba cada respuesta y devuelve el resumen."""
    salida.mkdir(parents=True, exist_ok=True)
    ligas = cliente.paginar("/leagues", {"include": "currentSeason;seasons"})
    _grabar(salida / "ligas.json", ligas)
    resumen_ligas = [
        _explorar_liga(cliente, salida, liga, jugadores_por_liga, equipos_por_liga, listado_general)
        for liga in ligas
    ]
    resumen = {"ligas": resumen_ligas, "pedidos_usados": cliente.pedidos_usados}
    _grabar(salida / "resumen.json", resumen)
    return resumen


def _explorar_liga(
    cliente: ClienteSportmonks,
    salida: Path,
    liga: dict[str, Any],
    jugadores_por_liga: int,
    equipos_por_liga: int,
    listado_general: bool,
) -> dict[str, Any]:
    id_liga = liga.get("id")
    resumen: dict[str, Any] = {"id": id_liga, "nombre": liga.get("name"), "temporada": None}
    resumen["temporadas"] = _temporadas(liga)
    temporada = liga.get("currentseason") or liga.get("currentSeason") or {}
    id_temporada = temporada.get("id") if isinstance(temporada, dict) else None
    if id_temporada is None:
        resumen["aviso"] = "La liga no trae temporada actual: se prueba a mano con /seasons."
        return resumen
    resumen["temporada"] = id_temporada
    sufijo = f"{_seguro(str(liga.get('name') or id_liga))}_{id_temporada}"

    equipos = cliente.paginar(f"/teams/seasons/{id_temporada}", {})
    _grabar(salida / f"equipos_{sufijo}.json", equipos)
    resumen["equipos"] = len(equipos)
    if not equipos:
        return resumen

    filtro = f"playerStatisticSeasons:{id_temporada}"
    muestra: list[dict[str, Any]] = []
    planteles: list[int] = []
    for equipo in equipos[:equipos_por_liga]:
        id_equipo = equipo.get("id")
        plantel = cliente.obtener(f"/squads/seasons/{id_temporada}/teams/{id_equipo}", {})
        _grabar(salida / f"plantel_{sufijo}_{id_equipo}.json", plantel)
        ids = [fila.get("player_id") for fila in plantel.get("data") or [] if fila.get("player_id")]
        planteles.append(len(ids))
        for id_jugador in ids[:jugadores_por_liga]:
            respuesta = cliente.obtener(
                f"/players/{id_jugador}", {"include": INCLUDE_ESTADISTICAS, "filters": filtro}
            )
            _grabar(salida / f"jugador_{id_jugador}_{id_temporada}.json", respuesta)
            if respuesta.get("data"):
                muestra.append(respuesta["data"])
    resumen["planteles"] = planteles
    resumen["muestra"] = resumir_jugadores(muestra)

    if listado_general:
        resumen["masiva"] = _probar_listado_general(cliente, salida, sufijo, filtro)
    return resumen


def _probar_listado_general(
    cliente: ClienteSportmonks, salida: Path, sufijo: str, filtro: str
) -> dict[str, Any]:
    masiva = cliente.obtener(
        "/players", {"include": INCLUDE_ESTADISTICAS, "filters": filtro, "per_page": 50, "page": 1}
    )
    _grabar(salida / f"masiva_{sufijo}.json", masiva)
    paginacion = masiva.get("pagination") or {}
    return {
        **resumir_jugadores(masiva.get("data") or []),
        "hay_mas_paginas": bool(paginacion.get("has_more")),
        "paginacion": paginacion,
    }


def _temporadas(liga: dict[str, Any]) -> list[dict[str, Any]]:
    """Las temporadas que trae la liga, de la más nueva a la más vieja (máximo 6)."""
    temporadas = [
        {"id": t.get("id"), "nombre": t.get("name")}
        for t in liga.get("seasons") or []
        if isinstance(t, dict)
    ]
    return sorted(temporadas, key=lambda t: str(t["nombre"]), reverse=True)[:6]


def _grabar(ruta: Path, contenido: Any) -> None:
    ruta.write_text(json.dumps(contenido, ensure_ascii=False, indent=1), encoding="utf-8")


def _seguro(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", texto.lower()).strip("_") or "liga"


def main(argumentos: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Explora Sportmonks y graba las respuestas.")
    parser.add_argument("--salida", type=Path, default=CARPETA_POR_DEFECTO)
    parser.add_argument("--jugadores-por-liga", type=int, default=JUGADORES_POR_LIGA_POR_DEFECTO)
    parser.add_argument("--equipos-por-liga", type=int, default=EQUIPOS_POR_LIGA_POR_DEFECTO)
    parser.add_argument("--listado-general", action="store_true")
    opciones = parser.parse_args(argumentos)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    token = obtener_configuracion().sportmonks_token
    if not token:
        logger.error("Falta SPORTMONKS_TOKEN: definilo en el entorno antes de explorar.")
        return 1
    try:
        with ClienteSportmonks(token) as cliente:
            resumen = explorar(
                cliente,
                opciones.salida,
                jugadores_por_liga=opciones.jugadores_por_liga,
                equipos_por_liga=opciones.equipos_por_liga,
                listado_general=opciones.listado_general,
            )
    except ErrorSportmonks as error:
        logger.error("Falló la exploración: %s", error)
        return 1
    print(json.dumps(resumen, ensure_ascii=False, indent=1))
    logger.info("Respuestas grabadas en %s", opciones.salida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
