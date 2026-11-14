"""Sincronización de la trayectoria de los jugadores desde API-Football (DAT-004). Se corre con:

    python -m app.sincronizacion.trayectoria [--jugador <id interno>] [--max-pedidos <n>] [--forzar]

Un pedido por jugador (`/players/teams`). Se piden primero los jugadores con más minutos, los que
nunca se sincronizaron o se sincronizaron hace más de 30 días (RN-034), y solo los que tienen
`id_api_football`. Cada jugador se escribe en su propia transacción y **antes se pide a la API**:
si falla, su trayectoria anterior queda intacta y se reintenta en la próxima corrida (RN-025).
Si fallan varios jugadores seguidos se corta la corrida (por ejemplo, sin cupo). Sale con 0 si no
hubo errores y con 1 si algún jugador falló.
"""

import argparse
import logging
import sys
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_fabrica_sesiones
from app.integraciones.cliente_api_football import ClienteApiFootball, ErrorApiFootball
from app.modelos import Sincronizacion
from app.modelos.base import ahora_utc
from app.modelos.enums import EstadoSincronizacion, OrigenSincronizacion
from app.repositorios import trayectoria as repositorio
from app.sincronizacion.mapeo_trayectoria import mapear_trayectoria

logger = logging.getLogger(__name__)

# RN-034 (propuesta)
DIAS_PARA_REFRESCAR = 30
MAXIMO_PEDIDOS_POR_DEFECTO = 5000
ERRORES_SEGUIDOS_PARA_CORTAR = 5
LARGO_MAXIMO_MENSAJE_ERROR = 2000


def sincronizar_trayectorias(
    session: Session,
    cliente: ClienteApiFootball,
    *,
    max_pedidos: int = MAXIMO_PEDIDOS_POR_DEFECTO,
    forzar: bool = False,
    jugador_id: int | None = None,
    ahora: datetime | None = None,
) -> Sincronizacion:
    """Sincroniza la trayectoria de los jugadores pendientes. Devuelve la corrida registrada."""
    ahora = ahora or ahora_utc()
    pedidos_al_empezar = cliente.pedidos_usados
    sincronizacion = Sincronizacion(origen=OrigenSincronizacion.api_football_trayectoria)
    session.add(sincronizacion)
    # La corrida queda registrada aunque después falle
    session.commit()
    sincronizacion_id = sincronizacion.id

    pendientes = repositorio.jugadores_pendientes(
        session,
        ahora=ahora,
        dias_para_refrescar=DIAS_PARA_REFRESCAR,
        forzar=forzar,
        jugador_id=jugador_id,
    )
    sincronizados = errores = seguidos = 0
    ultimo_error: str | None = None
    cortada = False
    for id_jugador, id_api in pendientes:
        if cliente.pedidos_usados - pedidos_al_empezar >= max_pedidos:
            break
        try:
            respuesta = cliente.equipos_del_jugador(id_api)
            repositorio.reemplazar_trayectoria(
                session, id_jugador, mapear_trayectoria(respuesta), ahora
            )
            session.commit()
        except Exception as error:
            session.rollback()
            errores += 1
            seguidos += 1
            ultimo_error = _mensaje_de_error(error)
            logger.error(
                "Falló la trayectoria del jugador %s (API %s): %s", id_jugador, id_api, error
            )
            if isinstance(error, ErrorApiFootball) and seguidos >= ERRORES_SEGUIDOS_PARA_CORTAR:
                cortada = True
                break
            continue
        seguidos = 0
        sincronizados += 1

    sincronizacion = session.get(Sincronizacion, sincronizacion_id)
    sincronizacion.registros_actualizados = sincronizados
    sincronizacion.pedidos_usados = cliente.pedidos_usados - pedidos_al_empezar
    sincronizacion.estado = EstadoSincronizacion.error if errores else EstadoSincronizacion.ok
    if errores:
        mensaje = f"Fallaron {errores} jugadores. Último error: {ultimo_error}"
        if cortada:
            mensaje += f" La corrida se cortó por {ERRORES_SEGUIDOS_PARA_CORTAR} errores seguidos."
        sincronizacion.mensaje_error = mensaje[:LARGO_MAXIMO_MENSAJE_ERROR]
    sincronizacion.finalizada_en = ahora_utc()
    session.commit()
    return sincronizacion


def ejecutar(session: Session, cliente: ClienteApiFootball, **opciones) -> int:
    """Corre la sincronización y devuelve el código de salida: 0 si todo salió bien, 1 si no."""
    sincronizacion = sincronizar_trayectorias(session, cliente, **opciones)
    logger.info(
        "Trayectoria: %s, %s jugadores, %s pedidos",
        sincronizacion.estado,
        sincronizacion.registros_actualizados,
        sincronizacion.pedidos_usados,
    )
    return 0 if sincronizacion.estado == EstadoSincronizacion.ok else 1


def main(argumentos: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Sincroniza la trayectoria de los jugadores desde API-Football."
    )
    parser.add_argument("--jugador", type=int, help="id interno de un jugador (por defecto, todos)")
    parser.add_argument(
        "--max-pedidos",
        type=int,
        default=MAXIMO_PEDIDOS_POR_DEFECTO,
        help=f"tope de pedidos de la corrida (por defecto, {MAXIMO_PEDIDOS_POR_DEFECTO})",
    )
    parser.add_argument(
        "--forzar", action="store_true", help="volver a pedir aunque se haya sincronizado hace poco"
    )
    opciones = parser.parse_args(argumentos)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    clave = obtener_configuracion().api_football_key
    if not clave:
        logger.error("Falta API_FOOTBALL_KEY: definila en el entorno antes de sincronizar.")
        return 1
    with ClienteApiFootball(clave) as cliente, obtener_fabrica_sesiones()() as session:
        return ejecutar(
            session,
            cliente,
            max_pedidos=opciones.max_pedidos,
            forzar=opciones.forzar,
            jugador_id=opciones.jugador,
        )


def _mensaje_de_error(error: Exception) -> str:
    # Los mensajes del cliente ya vienen sin la clave; los de la base no la pueden contener
    return f"{type(error).__name__}: {error}"[:LARGO_MAXIMO_MENSAJE_ERROR]


if __name__ == "__main__":
    sys.exit(main())
