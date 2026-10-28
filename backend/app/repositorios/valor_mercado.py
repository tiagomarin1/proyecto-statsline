"""Lectura y escritura del valor de mercado de los jugadores (DAT-002). No hace commit."""

from collections import defaultdict
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modelos import EstadisticaTemporada, Jugador, Liga
from app.servicios.valor_mercado import Cruce, JugadorParaCruce


def listar_jugadores_para_cruce(session: Session) -> list[JugadorParaCruce]:
    filas = session.execute(
        select(
            Jugador.id,
            Jugador.nombre,
            Jugador.nombre_pila,
            Jugador.apellido,
            Jugador.fecha_nacimiento,
        )
    )
    return [JugadorParaCruce(*fila) for fila in filas]


def guardar_valores(session: Session, cruces: dict[int, Cruce], fecha: date) -> int:
    """Deja el valor de mercado de cada jugador según el cruce. Devuelve cuántos cruzaron.

    Primero se limpian todos: así un jugador que ya no cruza no conserva un valor viejo, y el
    id_transfermarkt (único) puede pasar de un jugador a otro sin chocar.
    """
    session.execute(
        update(Jugador).values(
            valor_mercado_eur=None, id_transfermarkt=None, valor_mercado_fecha=None
        )
    )
    filas = [
        {
            "id": jugador_id,
            "valor_mercado_eur": cruce.fila.valor_mercado_eur,
            "id_transfermarkt": cruce.fila.id_transfermarkt,
            "valor_mercado_fecha": fecha,
        }
        for jugador_id, cruce in cruces.items()
        if cruce.fila is not None
    ]
    if filas:
        session.execute(update(Jugador), filas)
    return len(filas)


def ligas_por_jugador(session: Session) -> dict[int, list[str]]:
    """Ligas en las que juega cada jugador en la temporada actual de esa liga."""
    filas = session.execute(
        select(EstadisticaTemporada.jugador_id, Liga.nombre)
        .join(Liga, Liga.id == EstadisticaTemporada.liga_id)
        .where(EstadisticaTemporada.temporada == Liga.temporada_actual)
        .distinct()
    )
    ligas: dict[int, list[str]] = defaultdict(list)
    for jugador_id, nombre in filas:
        ligas[jugador_id].append(nombre)
    return ligas
