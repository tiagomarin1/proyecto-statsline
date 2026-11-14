"""Pasa la respuesta de `/players/teams` de API-Football a la trayectoria, sin tocar la base.

Cada entrada trae un club y la lista de sus temporadas: se guarda una fila por club y temporada
(DAT-004). Las selecciones nacionales no son clubes y se descartan (RN-033).
"""

import re
from dataclasses import dataclass
from typing import Any

from app.servicios.valor_mercado import normalizar_nombre

ANIO_MINIMO = 1900
ANIO_MAXIMO = 2100
LARGO_NOMBRE_CLUB = 120

# RN-033 (propuesta). API-Football no marca las selecciones: se reconocen porque su nombre es el
# de un país, con o sin categoría ("U17", "U20", "W"). La lista es una aproximación: hay que
# revisarla con datos reales. Los nombres van normalizados (minúsculas, sin tildes).
PAISES = frozenset(
    {
        "argentina", "bolivia", "brazil", "brasil", "chile", "colombia", "ecuador", "paraguay",
        "peru", "uruguay", "venezuela", "mexico", "usa", "united states", "canada", "costa rica",
        "panama", "honduras", "el salvador", "guatemala", "jamaica", "haiti", "cuba",
        "dominican republic", "spain", "italy", "france", "germany", "portugal", "england",
        "scotland", "wales", "northern ireland", "ireland", "netherlands", "belgium",
        "switzerland", "austria", "croatia", "serbia", "poland", "ukraine", "russia", "turkey",
        "greece", "sweden", "norway", "denmark", "finland", "iceland", "czech republic",
        "hungary", "romania", "bulgaria", "slovakia", "slovenia", "bosnia and herzegovina",
        "albania", "montenegro", "north macedonia", "malta", "cyprus", "israel", "morocco",
        "algeria", "tunisia", "egypt", "nigeria", "ghana", "senegal", "cameroon", "ivory coast",
        "south africa", "japan", "south korea", "korea republic", "china", "australia",
        "new zealand", "iran", "saudi arabia", "qatar",
    }
)  # fmt: skip
# Categorías al final del nombre de una selección: "u20", "u 23" (de "U-23") y "w"
_CATEGORIAS = re.compile(r"(\s+(u\s?\d{2}|w))+$")


@dataclass(frozen=True)
class PasoTrayectoria:
    id_club_api_football: int
    nombre_club: str
    # None si la API no informa los años de ese club
    temporada: int | None


def es_seleccion(nombre: str | None) -> bool:
    """RN-033: el nombre es el de un país, con o sin categoría. Un club con nombre parecido
    ("Argentino de Quilmes", "Atlético Argentino") no lo es."""
    sin_categoria = _CATEGORIAS.sub("", normalizar_nombre(nombre))
    return sin_categoria in PAISES


def mapear_trayectoria(respuesta: list[dict[str, Any]]) -> list[PasoTrayectoria]:
    """Una fila por club y temporada, sin selecciones ni repetidos.

    Un club sin temporadas válidas queda con una sola fila y temporada None (RN-008).
    """
    pasos: dict[tuple[int, int | None], PasoTrayectoria] = {}
    for entrada in respuesta:
        equipo = entrada.get("team") or {}
        id_club = _entero(equipo.get("id"))
        nombre = _texto(equipo.get("name"))
        if id_club is None or nombre is None or es_seleccion(nombre):
            continue
        temporadas = sorted(
            {t for t in map(_temporada, entrada.get("seasons") or []) if t is not None}
        )
        for temporada in temporadas or [None]:
            pasos.setdefault((id_club, temporada), PasoTrayectoria(id_club, nombre, temporada))
    return list(pasos.values())


def _temporada(valor: Any) -> int | None:
    """Las temporadas llegan a veces como número y a veces como texto."""
    if isinstance(valor, bool):
        return None
    try:
        anio = int(valor)
    except (TypeError, ValueError):
        return None
    return anio if ANIO_MINIMO <= anio <= ANIO_MAXIMO else None


def _entero(valor: Any) -> int | None:
    if valor is None or isinstance(valor, bool):
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _texto(valor: Any) -> str | None:
    if not isinstance(valor, str) or not valor.strip():
        return None
    return valor.strip()[:LARGO_NOMBRE_CLUB]
