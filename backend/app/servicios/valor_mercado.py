"""Cruce de los jugadores de API-Football con transfermarkt-datasets (RN-002).

1. Coincidencia exacta: misma fecha de nacimiento y el nombre normalizado de Transfermarkt igual
   a normalizar(nombre_pila + " " + apellido) o a normalizar(nombre).
2. Si no hay ninguna, coincidencia por palabras **(propuesta, 28/10)**: misma fecha y todas las
   palabras del nombre de Transfermarkt (al menos 2) dentro de nombre_pila + apellido.
En los dos pasos, solo vale si hay exactamente un candidato; con más, es ambiguo. Sin fecha de
nacimiento no se cruza. Las funciones son puras: no tocan la base.
"""

import re
import unicodedata
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from app.integraciones.lector_transfermarkt import FilaTransfermarkt

MINIMO_PALABRAS_CRUCE_POR_PALABRAS = 2


class ResultadoCruce(StrEnum):
    cruzado = "cruzado"
    sin_coincidencia = "sin_coincidencia"
    ambiguo = "ambiguo"
    sin_fecha = "sin_fecha"


@dataclass(frozen=True)
class JugadorParaCruce:
    id: int
    nombre: str
    nombre_pila: str | None
    apellido: str | None
    fecha_nacimiento: date | None


@dataclass(frozen=True)
class Cruce:
    resultado: ResultadoCruce
    # Solo cuando resultado es cruzado. Su valor puede ser None (vacío en el CSV)
    fila: FilaTransfermarkt | None = None


def normalizar_nombre(texto: str | None) -> str:
    """RN-002: minúsculas, sin tildes, sin signos y con espacios simples."""
    descompuesto = unicodedata.normalize("NFKD", texto or "")
    sin_tildes = "".join(c for c in descompuesto if not unicodedata.combining(c)).lower()
    return " ".join(re.sub(r"[^a-z0-9]", " ", sin_tildes).split())


def cruzar_jugadores(
    jugadores: Iterable[JugadorParaCruce], filas: Iterable[FilaTransfermarkt]
) -> dict[int, Cruce]:
    """Cruza cada jugador con las filas del CSV. Devuelve {jugador.id: Cruce}.

    Si dos jugadores cruzan con la misma fila, los dos quedan ambiguos: id_transfermarkt es único.
    """
    por_fecha: dict[date, list[FilaTransfermarkt]] = defaultdict(list)
    for fila in filas:
        if fila.fecha_nacimiento is not None:
            por_fecha[fila.fecha_nacimiento].append(fila)

    cruces = {jugador.id: _cruzar(jugador, por_fecha) for jugador in jugadores}
    usos = Counter(c.fila.id_transfermarkt for c in cruces.values() if c.fila is not None)
    return {
        jugador_id: Cruce(ResultadoCruce.ambiguo)
        if cruce.fila is not None and usos[cruce.fila.id_transfermarkt] > 1
        else cruce
        for jugador_id, cruce in cruces.items()
    }


def _cruzar(jugador: JugadorParaCruce, por_fecha: dict[date, list[FilaTransfermarkt]]) -> Cruce:
    if jugador.fecha_nacimiento is None:
        return Cruce(ResultadoCruce.sin_fecha)
    candidatas = por_fecha.get(jugador.fecha_nacimiento, [])
    completo = normalizar_nombre(f"{jugador.nombre_pila or ''} {jugador.apellido or ''}")
    nombres = {completo, normalizar_nombre(jugador.nombre)} - {""}

    exactas = [f for f in candidatas if normalizar_nombre(f.nombre) in nombres]
    if exactas:
        return _unica(exactas)
    palabras = set(completo.split())
    por_palabras = [f for f in candidatas if _palabras_contenidas(f.nombre, palabras)]
    return _unica(por_palabras)


def _palabras_contenidas(nombre_transfermarkt: str, palabras: set[str]) -> bool:
    propias = normalizar_nombre(nombre_transfermarkt).split()
    return len(propias) >= MINIMO_PALABRAS_CRUCE_POR_PALABRAS and set(propias) <= palabras


def _unica(filas: list[FilaTransfermarkt]) -> Cruce:
    distintas = {fila.id_transfermarkt: fila for fila in filas}
    if not distintas:
        return Cruce(ResultadoCruce.sin_coincidencia)
    if len(distintas) > 1:
        return Cruce(ResultadoCruce.ambiguo)
    return Cruce(ResultadoCruce.cruzado, next(iter(distintas.values())))
