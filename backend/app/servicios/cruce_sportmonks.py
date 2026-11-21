"""Cruce de los jugadores de Sportmonks con los de la base (RN-030, propuesta).

Sirve para no duplicar a un jugador que pasa de una liga a otra. Las funciones son puras: no tocan
la base.

1. Si la base ya tiene un jugador con ese `id_sportmonks`, es ese (se reconoce en cada
   sincronización).
2. Si no, se busca un jugador de la base **sin** `id_sportmonks`, con la misma fecha de nacimiento
   y el mismo nombre normalizado (el nombre para mostrar, o nombre de pila + apellido).
3. Solo vale si hay exactamente un candidato. Con ninguno o con varios, se crea un jugador nuevo.
   Sin fecha de nacimiento no se cruza.
4. Si dos jugadores de Sportmonks cruzan con el mismo jugador de la base, los dos quedan como
   nuevos (ambiguo): `id_sportmonks` es único.
"""

from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from app.servicios.valor_mercado import normalizar_nombre


class TipoCruce(StrEnum):
    existente = "existente"
    cruzado = "cruzado"
    nuevo = "nuevo"


class MotivoNuevo(StrEnum):
    sin_coincidencia = "sin_coincidencia"
    ambiguo = "ambiguo"
    sin_fecha = "sin_fecha"


@dataclass(frozen=True)
class JugadorSportmonks:
    id_sportmonks: int
    nombre: str
    nombre_pila: str | None
    apellido: str | None
    fecha_nacimiento: date | None
    nacionalidad: str | None = None


@dataclass(frozen=True)
class JugadorExistente:
    id: int
    nombre: str
    nombre_pila: str | None
    apellido: str | None
    fecha_nacimiento: date | None
    id_sportmonks: int | None


@dataclass(frozen=True)
class ResultadoCruce:
    tipo: TipoCruce
    # El jugador de la base, para `existente` y `cruzado`
    jugador_id: int | None = None
    # Por qué es nuevo, solo para `nuevo`
    motivo: MotivoNuevo | None = None


def cruzar_jugadores(
    jugadores: Iterable[JugadorSportmonks], existentes: Iterable[JugadorExistente]
) -> dict[int, ResultadoCruce]:
    """Devuelve {id_sportmonks: ResultadoCruce} para cada jugador de Sportmonks."""
    existentes = list(existentes)
    por_id_sportmonks = {e.id_sportmonks: e for e in existentes if e.id_sportmonks is not None}
    # Los que ya tienen otro id_sportmonks no son candidatos: no se reasignan
    por_fecha: dict[date, list[JugadorExistente]] = defaultdict(list)
    for existente in existentes:
        if existente.fecha_nacimiento is not None and existente.id_sportmonks is None:
            por_fecha[existente.fecha_nacimiento].append(existente)

    resultados: dict[int, ResultadoCruce] = {}
    for jugador in jugadores:
        conocido = por_id_sportmonks.get(jugador.id_sportmonks)
        resultados[jugador.id_sportmonks] = (
            ResultadoCruce(TipoCruce.existente, conocido.id)
            if conocido is not None
            else _cruzar(jugador, por_fecha)
        )

    usos = Counter(r.jugador_id for r in resultados.values() if r.tipo == TipoCruce.cruzado)
    return {
        id_sportmonks: ResultadoCruce(TipoCruce.nuevo, motivo=MotivoNuevo.ambiguo)
        if r.tipo == TipoCruce.cruzado and usos[r.jugador_id] > 1
        else r
        for id_sportmonks, r in resultados.items()
    }


def _cruzar(
    jugador: JugadorSportmonks, por_fecha: dict[date, list[JugadorExistente]]
) -> ResultadoCruce:
    if jugador.fecha_nacimiento is None:
        return ResultadoCruce(TipoCruce.nuevo, motivo=MotivoNuevo.sin_fecha)
    nombres = _nombres(jugador)
    candidatos = {
        e.id: e for e in por_fecha.get(jugador.fecha_nacimiento, []) if nombres & _nombres(e)
    }
    if not candidatos:
        return ResultadoCruce(TipoCruce.nuevo, motivo=MotivoNuevo.sin_coincidencia)
    if len(candidatos) > 1:
        return ResultadoCruce(TipoCruce.nuevo, motivo=MotivoNuevo.ambiguo)
    return ResultadoCruce(TipoCruce.cruzado, next(iter(candidatos)))


def _nombres(jugador: JugadorSportmonks | JugadorExistente) -> set[str]:
    """Las formas normalizadas del nombre: el nombre para mostrar y nombre de pila + apellido."""
    completo = normalizar_nombre(f"{jugador.nombre_pila or ''} {jugador.apellido or ''}")
    return {completo, normalizar_nombre(jugador.nombre)} - {""}
