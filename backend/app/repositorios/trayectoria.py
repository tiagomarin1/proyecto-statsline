"""Lectura y escritura de la trayectoria de los jugadores (DAT-004).

No hace commit: la transacción de cada jugador la maneja la sincronización.
"""

from datetime import datetime, timedelta

from sqlalchemy import delete, func, insert, or_, select, update
from sqlalchemy.orm import Session

from app.modelos import EstadisticaTemporada, Jugador, Trayectoria
from app.sincronizacion.mapeo_trayectoria import PasoTrayectoria


def jugadores_pendientes(
    session: Session,
    *,
    ahora: datetime,
    dias_para_refrescar: int,
    forzar: bool = False,
    jugador_id: int | None = None,
) -> list[tuple[int, int]]:
    """Jugadores cuya trayectoria hay que pedir: [(id interno, id_api_football)] (RN-034).

    Solo los que tienen `id_api_football`. Sin `forzar`, los que nunca se sincronizaron o se
    sincronizaron hace más de `dias_para_refrescar`. Van primero los de más minutos jugados.
    """
    minutos = (
        select(
            EstadisticaTemporada.jugador_id,
            func.max(EstadisticaTemporada.minutos_jugados).label("minutos"),
        )
        .group_by(EstadisticaTemporada.jugador_id)
        .subquery()
    )
    consulta = (
        select(Jugador.id, Jugador.id_api_football)
        .outerjoin(minutos, minutos.c.jugador_id == Jugador.id)
        .where(Jugador.id_api_football.is_not(None))
    )
    if jugador_id is not None:
        consulta = consulta.where(Jugador.id == jugador_id)
    if not forzar:
        limite = ahora - timedelta(days=dias_para_refrescar)
        consulta = consulta.where(
            or_(
                Jugador.trayectoria_sincronizada_en.is_(None),
                Jugador.trayectoria_sincronizada_en < limite,
            )
        )
    consulta = consulta.order_by(minutos.c.minutos.desc().nulls_last(), Jugador.id)
    return [(fila[0], fila[1]) for fila in session.execute(consulta)]


def pasos_del_jugador(session: Session, jugador_id: int) -> list[PasoTrayectoria]:
    """Los clubes y temporadas guardados de un jugador, para armar su trayectoria (JUG-003)."""
    filas = session.execute(
        select(
            Trayectoria.id_club_api_football, Trayectoria.nombre_club, Trayectoria.temporada
        ).where(Trayectoria.jugador_id == jugador_id)
    )
    return [PasoTrayectoria(id_club, nombre, temporada) for id_club, nombre, temporada in filas]


def reemplazar_trayectoria(
    session: Session, jugador_id: int, pasos: list[PasoTrayectoria], ahora: datetime
) -> None:
    """Deja como trayectoria del jugador exactamente `pasos` y lo marca como sincronizado."""
    session.execute(delete(Trayectoria).where(Trayectoria.jugador_id == jugador_id))
    if pasos:
        session.execute(
            insert(Trayectoria),
            [
                {
                    "jugador_id": jugador_id,
                    "id_club_api_football": paso.id_club_api_football,
                    "nombre_club": paso.nombre_club,
                    "temporada": paso.temporada,
                }
                for paso in pasos
            ],
        )
    session.execute(
        update(Jugador).where(Jugador.id == jugador_id).values(trayectoria_sincronizada_en=ahora)
    )
