"""Sincronización con Sportmonks (DAT-003, ADR-0011). Se corre con:

    python -m app.sincronizacion.sportmonks [--liga <id interno>] [--temporada <anio>]

Sincroniza las ligas con fuente "sportmonks" (RN-029). Por cada una: sin --temporada, se elige la
temporada según RN-027; se piden los equipos de la temporada, el plantel de cada uno y las
estadísticas de cada jugador que tiene (`has_values`), se escribe todo en una transacción y se
recalcula la cobertura (RN-020). Si algo falla, se deshace esa liga, los datos anteriores quedan
intactos y la corrida queda registrada con estado "error" (RN-025). Las demás ligas se procesan
igual. Sale con 0 si todas quedaron "ok" y con 1 si alguna falló.

Sportmonks no tiene una llamada por liga, así que una liga completa son unos 1.000 a 1.500 pedidos.
"""

import argparse
import logging
import re
import sys
from typing import Any

from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_fabrica_sesiones
from app.integraciones.cliente_sportmonks import ClienteSportmonks
from app.modelos import Liga, Sincronizacion
from app.modelos.base import ahora_utc
from app.modelos.enums import EstadoSincronizacion, FuenteDatos, OrigenSincronizacion
from app.repositorios import liga as repositorio_liga
from app.repositorios import sincronizacion_api_football as repositorio_cobertura
from app.repositorios import sincronizacion_sportmonks as repositorio
from app.servicios.cobertura import calcular_cobertura
from app.servicios.temporada import (
    MAXIMO_TEMPORADAS_A_PROBAR,
    UMBRAL_JUGADORES_CON_MINUTOS,
    alcanza_para_usarse,
)
from app.sincronizacion.mapeo_sportmonks import (
    DatosDeLigaSportmonks,
    contar_jugadores_con_minutos,
    mapear_liga,
)

logger = logging.getLogger(__name__)

LARGO_MAXIMO_MENSAJE_ERROR = 2000


def sincronizar_liga(
    session: Session,
    cliente: ClienteSportmonks,
    liga: Liga,
    temporada: int | None = None,
    *,
    umbral_jugadores: int = UMBRAL_JUGADORES_CON_MINUTOS,
) -> Sincronizacion:
    """Sincroniza una liga. Sin `temporada`, la elige según RN-027 (elegir_temporada)."""
    liga_id, id_liga_sm = liga.id, liga.id_sportmonks
    pedidos_al_empezar = cliente.pedidos_usados
    sincronizacion = Sincronizacion(
        origen=OrigenSincronizacion.sportmonks, liga_id=liga_id, temporada=temporada
    )
    session.add(sincronizacion)
    # La corrida queda registrada aunque después se deshagan los datos de la liga
    session.commit()
    sincronizacion_id = sincronizacion.id
    try:
        if id_liga_sm is None:
            raise ValueError(f"La liga {liga_id} no tiene id_sportmonks.")
        temporadas = _temporadas(cliente.liga(id_liga_sm))
        if temporada is None:
            temporada, datos = elegir_temporada(cliente, temporadas, umbral_jugadores)
        else:
            if temporada not in temporadas:
                raise ValueError(f"La liga {liga_id} no tiene la temporada {temporada}.")
            datos = traer_datos_de_liga(cliente, temporadas[temporada])
        registros = repositorio.guardar_datos_de_liga(session, datos, liga_id, temporada)
        liga.temporada_actual = temporada
        liga.cobertura = calcular_cobertura(
            *repositorio_cobertura.contar_para_cobertura(session, liga_id, temporada)
        )
        sincronizacion.estado = EstadoSincronizacion.ok
        sincronizacion.registros_actualizados = registros
    except Exception as error:
        session.rollback()
        sincronizacion = session.get(Sincronizacion, sincronizacion_id)
        sincronizacion.estado = EstadoSincronizacion.error
        sincronizacion.mensaje_error = _mensaje_de_error(error)
        logger.error("Falló la liga %s (Sportmonks %s): %s", liga_id, id_liga_sm, error)
    sincronizacion.temporada = temporada
    sincronizacion.pedidos_usados = cliente.pedidos_usados - pedidos_al_empezar
    sincronizacion.finalizada_en = ahora_utc()
    session.commit()
    return sincronizacion


def elegir_temporada(
    cliente: ClienteSportmonks, temporadas: dict[int, int], umbral_jugadores: int
) -> tuple[int, DatosDeLigaSportmonks]:
    """RN-027: la temporada más reciente con al menos `umbral_jugadores` jugadores con minutos.

    Prueba como máximo MAXIMO_TEMPORADAS_A_PROBAR, de la más nueva a la más vieja. Si ninguna
    alcanza, devuelve la más nueva: la liga queda sin_datos o basica según RN-020.
    """
    mas_nueva: tuple[int, DatosDeLigaSportmonks] | None = None
    for anio in sorted(temporadas, reverse=True)[:MAXIMO_TEMPORADAS_A_PROBAR]:
        datos = traer_datos_de_liga(cliente, temporadas[anio])
        mas_nueva = mas_nueva or (anio, datos)
        if alcanza_para_usarse(contar_jugadores_con_minutos(datos), umbral_jugadores):
            return anio, datos
    if mas_nueva is None:
        raise ValueError("La liga no tiene temporadas.")
    return mas_nueva


def traer_datos_de_liga(cliente: ClienteSportmonks, id_temporada: int) -> DatosDeLigaSportmonks:
    """Pide los equipos, los planteles y las estadísticas de cada jugador que las tiene.

    Un jugador que figura en dos planteles se pide una sola vez. Se piden todos antes de escribir
    nada (RN-025).
    """
    equipos = cliente.equipos_de_la_temporada(id_temporada)
    ids_de_jugadores: dict[int, None] = {}
    for equipo in equipos:
        for fila in cliente.plantel(id_temporada, equipo["id"]):
            if fila.get("has_values") and fila.get("player_id"):
                ids_de_jugadores.setdefault(fila["player_id"])
    jugadores = [cliente.jugador(id_jugador, id_temporada) for id_jugador in ids_de_jugadores]
    return mapear_liga(equipos, [j for j in jugadores if j], id_temporada, cliente.paises())


def ejecutar(
    session: Session,
    cliente: ClienteSportmonks,
    *,
    liga_id: int | None = None,
    temporada: int | None = None,
    umbral_jugadores: int = UMBRAL_JUGADORES_CON_MINUTOS,
) -> int:
    """Sincroniza una liga o todas las de Sportmonks, una transacción por liga. Devuelve el
    código de salida."""
    if liga_id is None:
        ligas = [
            liga
            for liga in repositorio_liga.listar_en_orden(session)
            if liga.fuente == FuenteDatos.sportmonks
        ]
    else:
        liga = repositorio_liga.obtener_por_id(session, liga_id)
        if liga is None:
            logger.error("No existe la liga con id %s.", liga_id)
            return 1
        if liga.fuente != FuenteDatos.sportmonks:
            logger.error(
                "La liga %s tiene fuente %s, no sportmonks (RN-029).", liga_id, liga.fuente
            )
            return 1
        ligas = [liga]
    resultados = []
    for liga in ligas:
        nombre = liga.nombre
        sincronizacion = sincronizar_liga(
            session, cliente, liga, temporada, umbral_jugadores=umbral_jugadores
        )
        logger.info(
            "%s (temporada %s): %s, %s registros, %s pedidos, cobertura %s",
            nombre,
            sincronizacion.temporada,
            sincronizacion.estado,
            sincronizacion.registros_actualizados,
            sincronizacion.pedidos_usados,
            liga.cobertura,
        )
        resultados.append(sincronizacion.estado)
    return 0 if all(estado == EstadoSincronizacion.ok for estado in resultados) else 1


def main(argumentos: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sincroniza jugadores desde Sportmonks.")
    parser.add_argument("--liga", type=int, help="id interno de la liga (por defecto, todas)")
    parser.add_argument("--temporada", type=int, help="año (por defecto, la que elige RN-027)")
    opciones = parser.parse_args(argumentos)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    token = obtener_configuracion().sportmonks_token
    if not token:
        logger.error("Falta SPORTMONKS_TOKEN: definilo en el entorno antes de sincronizar.")
        return 1
    with ClienteSportmonks(token) as cliente, obtener_fabrica_sesiones()() as session:
        return ejecutar(session, cliente, liga_id=opciones.liga, temporada=opciones.temporada)


def _temporadas(liga: dict[str, Any]) -> dict[int, int]:
    """{año: id de temporada} a partir del nombre ("2026") de cada temporada de la liga."""
    temporadas: dict[int, int] = {}
    for temporada in liga.get("seasons") or []:
        coincidencia = re.match(r"\d{4}", str(temporada.get("name") or ""))
        if coincidencia and temporada.get("id") is not None:
            temporadas[int(coincidencia.group())] = temporada["id"]
    return temporadas


def _mensaje_de_error(error: Exception) -> str:
    # Los mensajes del cliente ya vienen sin el token; los de la base no lo pueden contener
    return f"{type(error).__name__}: {error}"[:LARGO_MAXIMO_MENSAJE_ERROR]


if __name__ == "__main__":
    sys.exit(main())
