"""Sincronización con API-Football (DAT-001, ADR-0008). Se corre con:

    python -m app.sincronizacion.api_football [--liga <id interno>] [--temporada <anio>]

Por cada liga: se piden todas las páginas de /players, se escribe todo en una transacción y se
recalcula la cobertura (RN-020). Si algo falla, se deshace esa liga, los datos anteriores
quedan intactos y la corrida queda registrada con estado "error" (RN-025). Las demás ligas se
procesan igual. Sale con 0 si todas quedaron "ok" y con 1 si alguna falló.
"""

import argparse
import logging
import sys

from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_fabrica_sesiones
from app.integraciones.cliente_api_football import ClienteApiFootball
from app.modelos import Liga, Sincronizacion
from app.modelos.base import ahora_utc
from app.modelos.enums import EstadoSincronizacion, OrigenSincronizacion
from app.repositorios import liga as repositorio_liga
from app.repositorios import sincronizacion_api_football as repositorio
from app.servicios.cobertura import calcular_cobertura
from app.sincronizacion.mapeo import mapear_jugadores

logger = logging.getLogger(__name__)

LARGO_MAXIMO_MENSAJE_ERROR = 2000


def sincronizar_liga(
    session: Session, cliente: ClienteApiFootball, liga: Liga, temporada: int | None = None
) -> Sincronizacion:
    """Sincroniza una liga. Sin `temporada`, usa la actual según API-Football (supuesto)."""
    liga_id, id_liga_api = liga.id, liga.id_api_football
    pedidos_al_empezar = cliente.pedidos_usados
    sincronizacion = Sincronizacion(
        origen=OrigenSincronizacion.api_football, liga_id=liga_id, temporada=temporada
    )
    session.add(sincronizacion)
    # La corrida queda registrada aunque después se deshagan los datos de la liga
    session.commit()
    sincronizacion_id = sincronizacion.id
    try:
        temporada = temporada or cliente.temporada_actual(id_liga_api)
        datos = mapear_jugadores(cliente.jugadores(id_liga_api, temporada), id_liga_api)
        registros = repositorio.guardar_datos_de_liga(session, datos, liga_id, temporada)
        liga.temporada_actual = temporada
        liga.cobertura = calcular_cobertura(
            *repositorio.contar_para_cobertura(session, liga_id, temporada)
        )
        sincronizacion.estado = EstadoSincronizacion.ok
        sincronizacion.registros_actualizados = registros
    except Exception as error:
        session.rollback()
        sincronizacion = session.get(Sincronizacion, sincronizacion_id)
        sincronizacion.estado = EstadoSincronizacion.error
        sincronizacion.mensaje_error = _mensaje_de_error(error)
        logger.error("Falló la liga %s (API-Football %s): %s", liga_id, id_liga_api, error)
    sincronizacion.temporada = temporada
    sincronizacion.pedidos_usados = cliente.pedidos_usados - pedidos_al_empezar
    sincronizacion.finalizada_en = ahora_utc()
    session.commit()
    return sincronizacion


def ejecutar(
    session: Session,
    cliente: ClienteApiFootball,
    *,
    liga_id: int | None = None,
    temporada: int | None = None,
) -> int:
    """Sincroniza una liga o todas, una transacción por liga. Devuelve el código de salida."""
    if liga_id is None:
        ligas = repositorio_liga.listar_en_orden(session)
    else:
        liga = repositorio_liga.obtener_por_id(session, liga_id)
        if liga is None:
            logger.error("No existe la liga con id %s.", liga_id)
            return 1
        ligas = [liga]
    resultados = []
    for liga in ligas:
        nombre = liga.nombre
        sincronizacion = sincronizar_liga(session, cliente, liga, temporada)
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
    parser = argparse.ArgumentParser(description="Sincroniza jugadores desde API-Football.")
    parser.add_argument("--liga", type=int, help="id interno de la liga (por defecto, todas)")
    parser.add_argument("--temporada", type=int, help="año (por defecto, la actual de la API)")
    opciones = parser.parse_args(argumentos)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    clave = obtener_configuracion().api_football_key
    if not clave:
        logger.error("Falta API_FOOTBALL_KEY: definila en el entorno antes de sincronizar.")
        return 1
    with ClienteApiFootball(clave) as cliente, obtener_fabrica_sesiones()() as session:
        return ejecutar(session, cliente, liga_id=opciones.liga, temporada=opciones.temporada)


def _mensaje_de_error(error: Exception) -> str:
    # Los mensajes del cliente ya vienen sin la clave; los de la base no la pueden contener
    return f"{type(error).__name__}: {error}"[:LARGO_MAXIMO_MENSAJE_ERROR]


if __name__ == "__main__":
    sys.exit(main())
