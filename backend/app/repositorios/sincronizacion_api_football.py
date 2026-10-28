"""Escritura de la sincronización con API-Football (DAT-001): upserts y conteos de cobertura.

Los upserts usan INSERT ... ON CONFLICT de PostgreSQL por id_api_football (jugador y equipo) y
por la clave única de estadistica_temporada (RN-025). No hacen commit: la transacción por liga
la maneja la sincronización.
"""

from collections.abc import Iterator, Sequence
from dataclasses import asdict
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modelos import Equipo, EstadisticaTemporada, Jugador
from app.sincronizacion.mapeo import DatosDeLiga

# Lotes chicos para no pasar el límite de parámetros de un INSERT de PostgreSQL
TAMANO_LOTE = 500
CLAVE_ESTADISTICA = ("jugador_id", "liga_id", "equipo_id", "temporada")
# Lo que trae API-Football. El valor de mercado (DAT-002) no se toca
COLUMNAS_JUGADOR = ("nombre", "nombre_pila", "apellido", "fecha_nacimiento", "nacionalidad")
COLUMNAS_ESTADISTICA = (
    "posicion",
    "partidos_jugados",
    "minutos_jugados",
    "goles",
    "asistencias",
    "pases_precision_pct",
    "duelos_totales",
    "duelos_ganados",
    "rating",
    "intercepciones",
)


def guardar_datos_de_liga(
    session: Session, datos: DatosDeLiga, liga_id: int, temporada: int
) -> int:
    """Inserta o actualiza equipos, jugadores y estadísticas. Devuelve cuántas estadísticas."""
    ids_equipo = _upsert_por_id_api(
        session, Equipo, [asdict(equipo) for equipo in datos.equipos], ("nombre",)
    )
    ids_jugador = _upsert_por_id_api(
        session,
        Jugador,
        [asdict(jugador) for jugador in datos.jugadores],
        COLUMNAS_JUGADOR,
        actualizado_en=func.now(),
    )
    filas = [
        {
            "jugador_id": ids_jugador[estadistica.id_jugador_api],
            "liga_id": liga_id,
            "equipo_id": ids_equipo[estadistica.id_equipo_api],
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


def contar_para_cobertura(session: Session, liga_id: int, temporada: int) -> tuple[int, int]:
    """RN-020: jugadores con minutos > 0 en la liga y temporada, y cuántos de ellos tienen pases."""
    con_minutos = (
        EstadisticaTemporada.liga_id == liga_id,
        EstadisticaTemporada.temporada == temporada,
        EstadisticaTemporada.minutos_jugados > 0,
    )
    jugadores = func.count(func.distinct(EstadisticaTemporada.jugador_id))
    total = session.scalar(select(jugadores).where(*con_minutos))
    con_pases = session.scalar(
        select(jugadores).where(*con_minutos, EstadisticaTemporada.pases_precision_pct.is_not(None))
    )
    return total or 0, con_pases or 0


def _upsert_por_id_api(
    session: Session,
    modelo: type[Equipo] | type[Jugador],
    filas: list[dict[str, Any]],
    columnas: Sequence[str],
    **valores_fijos: Any,
) -> dict[int, int]:
    """Upsert por id_api_football. Devuelve {id_api_football: id interno}."""
    ids: dict[int, int] = {}
    for lote in _en_lotes(filas):
        consulta = insert(modelo).values(lote)
        consulta = consulta.on_conflict_do_update(
            index_elements=["id_api_football"],
            set_={**{columna: consulta.excluded[columna] for columna in columnas}, **valores_fijos},
        ).returning(modelo.id_api_football, modelo.id)
        ids.update(dict(session.execute(consulta).tuples().all()))
    return ids


def _en_lotes(filas: list[dict[str, Any]]) -> Iterator[list[dict[str, Any]]]:
    for inicio in range(0, len(filas), TAMANO_LOTE):
        yield filas[inicio : inicio + TAMANO_LOTE]
