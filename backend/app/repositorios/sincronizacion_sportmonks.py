"""Escritura de la sincronización con Sportmonks (DAT-003): cruce de jugadores y upserts.

Los equipos y las estadísticas se insertan o actualizan con INSERT ... ON CONFLICT de PostgreSQL
(por id_sportmonks y por la clave única de estadistica_temporada). Los jugadores se cruzan antes
con los de la base (RN-030) para no duplicar a quien ya vino de API-Football. No hacen commit: la
transacción por liga la maneja la sincronización.
"""

from collections.abc import Iterator
from dataclasses import asdict
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modelos import Equipo, EstadisticaTemporada, Jugador
from app.repositorios.sincronizacion_api_football import (
    CLAVE_ESTADISTICA,
    COLUMNAS_ESTADISTICA,
    TAMANO_LOTE,
)
from app.servicios.cruce_sportmonks import (
    JugadorExistente,
    JugadorSportmonks,
    ResultadoCruce,
    TipoCruce,
    cruzar_jugadores,
)
from app.sincronizacion.mapeo_sportmonks import DatosDeLigaSportmonks

# Lo que se actualiza de un jugador que ya tenía id_sportmonks. La nacionalidad llega como un ID de
# país que todavía no se traduce, así que no se toca; el valor de mercado (DAT-002) tampoco
COLUMNAS_JUGADOR = ("nombre", "nombre_pila", "apellido", "fecha_nacimiento")


def guardar_datos_de_liga(
    session: Session, datos: DatosDeLigaSportmonks, liga_id: int, temporada: int
) -> int:
    """Inserta o actualiza equipos, jugadores y estadísticas. Devuelve cuántas estadísticas."""
    ids_equipo = _guardar_equipos(session, datos)
    ids_jugador = _guardar_jugadores(session, datos.jugadores)
    filas = [
        {
            "jugador_id": ids_jugador[estadistica.id_jugador_sportmonks],
            "liga_id": liga_id,
            "equipo_id": ids_equipo[estadistica.id_equipo_sportmonks],
            "temporada": temporada,
            **{columna: getattr(estadistica, columna) for columna in COLUMNAS_ESTADISTICA},
        }
        for estadistica in datos.estadisticas
    ]
    for lote in _en_lotes(filas):
        consulta = insert(EstadisticaTemporada).values(lote)
        consulta = consulta.on_conflict_do_update(
            index_elements=CLAVE_ESTADISTICA,
            set_={
                **{columna: consulta.excluded[columna] for columna in COLUMNAS_ESTADISTICA},
                "sincronizado_en": func.now(),
            },
        )
        session.execute(consulta)
    return len(filas)


def _guardar_equipos(session: Session, datos: DatosDeLigaSportmonks) -> dict[int, int]:
    """Upsert por id_sportmonks. Devuelve {id_sportmonks: id interno}."""
    ids: dict[int, int] = {}
    for lote in _en_lotes([asdict(equipo) for equipo in datos.equipos]):
        consulta = insert(Equipo).values(lote)
        consulta = consulta.on_conflict_do_update(
            index_elements=["id_sportmonks"], set_={"nombre": consulta.excluded["nombre"]}
        ).returning(Equipo.id_sportmonks, Equipo.id)
        ids.update(dict(session.execute(consulta).tuples().all()))
    return ids


def _guardar_jugadores(session: Session, jugadores: list[JugadorSportmonks]) -> dict[int, int]:
    """Cruza (RN-030), actualiza y crea. Devuelve {id_sportmonks: id interno}."""
    cruces = cruzar_jugadores(jugadores, _jugadores_existentes(session))
    ids: dict[int, int] = {}
    nuevos: list[dict[str, Any]] = []
    for jugador in jugadores:
        cruce = cruces[jugador.id_sportmonks]
        if cruce.tipo == TipoCruce.nuevo:
            nuevos.append(_fila_de_jugador(jugador))
            continue
        _actualizar_jugador(session, jugador, cruce)
        ids[jugador.id_sportmonks] = cruce.jugador_id
    for lote in _en_lotes(nuevos):
        consulta = insert(Jugador).values(lote).returning(Jugador.id_sportmonks, Jugador.id)
        ids.update(dict(session.execute(consulta).tuples().all()))
    return ids


def _actualizar_jugador(
    session: Session, jugador: JugadorSportmonks, cruce: ResultadoCruce
) -> None:
    if cruce.tipo == TipoCruce.existente:
        valores = {columna: getattr(jugador, columna) for columna in COLUMNAS_JUGADOR}
        # Un dato que Sportmonks no trae no pisa el que ya había
        valores = {c: v for c, v in valores.items() if v is not None}
    else:
        # Cruzado con uno de API-Football: se le suma el id y se conserva el resto
        valores = {"id_sportmonks": jugador.id_sportmonks}
    session.execute(
        update(Jugador)
        .where(Jugador.id == cruce.jugador_id)
        .values(**valores, actualizado_en=func.now())
    )


def _fila_de_jugador(jugador: JugadorSportmonks) -> dict[str, Any]:
    return {
        "id_sportmonks": jugador.id_sportmonks,
        **{columna: getattr(jugador, columna) for columna in COLUMNAS_JUGADOR},
    }


def _jugadores_existentes(session: Session) -> list[JugadorExistente]:
    filas = session.execute(
        select(
            Jugador.id,
            Jugador.nombre,
            Jugador.nombre_pila,
            Jugador.apellido,
            Jugador.fecha_nacimiento,
            Jugador.id_sportmonks,
        )
    )
    return [JugadorExistente(*fila) for fila in filas]


def _en_lotes(filas: list[dict[str, Any]]) -> Iterator[list[dict[str, Any]]]:
    for inicio in range(0, len(filas), TAMANO_LOTE):
        yield filas[inicio : inicio + TAMANO_LOTE]
