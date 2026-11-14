"""Cómo se arma la trayectoria que se muestra en la ficha (RN-032, propuesta). Función pura.

- Las temporadas de cada club se agrupan en tramos de años consecutivos; un hueco parte el club en
  dos tramos. Los tramos van del más reciente al más viejo.
- Los clubes se ordenan por su último año, del más reciente al más viejo (con el mismo año, por
  nombre). Los clubes sin años van al final y con tramos vacíos.
- El club actual va primero y marcado, aunque no figure en la trayectoria que trajo la API: se
  reconoce por el id de API-Football o, si el equipo no lo tiene, por el nombre.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from app.servicios.valor_mercado import normalizar_nombre
from app.sincronizacion.mapeo_trayectoria import PasoTrayectoria


@dataclass(frozen=True)
class Tramo:
    desde: int
    hasta: int


@dataclass(frozen=True)
class ClubActual:
    """El equipo de la estadística vigente del jugador (RN-017)."""

    # None si el equipo solo existe en Sportmonks
    id_club: int | None
    nombre: str


@dataclass(frozen=True)
class ClubTrayectoria:
    club: str
    actual: bool
    # Vacío si la API no informa los años de ese club
    tramos: list[Tramo]


def armar_trayectoria(
    pasos: Iterable[PasoTrayectoria], club_actual: ClubActual | None
) -> list[ClubTrayectoria]:
    """Agrupa, ordena y marca el club actual. Sin pasos ni club actual, la lista queda vacía."""
    clubes: dict[int, tuple[str, set[int]]] = {}
    for paso in pasos:
        nombre, temporadas = clubes.setdefault(paso.id_club_api_football, (paso.nombre_club, set()))
        if paso.temporada is not None:
            temporadas.add(paso.temporada)

    id_actual = _buscar_club_actual(clubes, club_actual)
    resultado = [
        ClubTrayectoria(nombre, id_club == id_actual, _tramos(temporadas))
        for id_club, (nombre, temporadas) in sorted(clubes.items(), key=_orden)
    ]
    if club_actual is not None and id_actual is None:
        resultado.insert(0, ClubTrayectoria(club_actual.nombre, True, []))
    else:
        # El club actual va primero; el resto conserva su orden
        resultado.sort(key=lambda c: not c.actual)
    return resultado


def _buscar_club_actual(
    clubes: dict[int, tuple[str, set[int]]], club_actual: ClubActual | None
) -> int | None:
    """El id del club actual dentro de la trayectoria, por id o por nombre normalizado."""
    if club_actual is None:
        return None
    if club_actual.id_club is not None and club_actual.id_club in clubes:
        return club_actual.id_club
    buscado = normalizar_nombre(club_actual.nombre)
    return next(
        (
            id_club
            for id_club, (nombre, _) in clubes.items()
            if normalizar_nombre(nombre) == buscado
        ),
        None,
    )


def _orden(item: tuple[int, tuple[str, set[int]]]) -> tuple[int, int, str]:
    _, (nombre, temporadas) = item
    ultimo = max(temporadas) if temporadas else None
    return (0 if ultimo is not None else 1, -(ultimo or 0), nombre.lower())


def _tramos(temporadas: set[int]) -> list[Tramo]:
    """Años consecutivos juntos, del tramo más reciente al más viejo."""
    tramos: list[Tramo] = []
    for anio in sorted(temporadas):
        if tramos and anio == tramos[-1].hasta + 1:
            tramos[-1] = Tramo(tramos[-1].desde, anio)
        else:
            tramos.append(Tramo(anio, anio))
    return tramos[::-1]
