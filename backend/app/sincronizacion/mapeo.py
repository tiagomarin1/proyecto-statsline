"""Pasa la respuesta de `/players` de API-Football al modelo canónico, sin tocar la base.

Mapeo de campos: INTEGRACIONES_EXTERNAS.md. Un dato que la API no trae o que no se puede
convertir queda en None, nunca en 0 (RN-008, RN-025).
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from app.modelos.enums import Posicion

# RN-019. "Forward" apareció en 2026 y su mapeo está como propuesta, pendiente del PO
POSICIONES_API = {
    "Goalkeeper": Posicion.arquero,
    "Defender": Posicion.defensor,
    "Midfielder": Posicion.mediocampista,
    "Attacker": Posicion.delantero,
    "Forward": Posicion.delantero,
}
DECIMALES_RATING = Decimal("0.01")
PORCENTAJE_MAXIMO = 100

# Largo de las columnas de texto (MODELO_CANONICO_DE_DATOS.md)
LARGO_NOMBRE = 120
LARGO_NOMBRE_PILA = 80
LARGO_APELLIDO = 80
LARGO_NACIONALIDAD = 60
LARGO_NOMBRE_EQUIPO = 120


@dataclass(frozen=True)
class DatosJugador:
    id_api_football: int
    nombre: str
    nombre_pila: str | None
    apellido: str | None
    fecha_nacimiento: date | None
    nacionalidad: str | None


@dataclass(frozen=True)
class DatosEquipo:
    id_api_football: int
    nombre: str


@dataclass(frozen=True)
class DatosEstadistica:
    id_jugador_api: int
    id_equipo_api: int
    posicion: Posicion | None
    partidos_jugados: int | None
    minutos_jugados: int | None
    goles: int | None
    asistencias: int | None
    pases_precision_pct: Decimal | None
    duelos_totales: int | None
    duelos_ganados: int | None
    rating: Decimal | None
    intercepciones: int | None


@dataclass(frozen=True)
class DatosDeLiga:
    """Lo que se escribe de una liga: cada jugador, equipo y estadística una sola vez."""

    jugadores: list[DatosJugador]
    equipos: list[DatosEquipo]
    estadisticas: list[DatosEstadistica]


def mapear_jugadores(respuesta: list[dict[str, Any]], id_liga_api: int) -> DatosDeLiga:
    """Mapea todos los `response[]` de `/players` de una liga.

    - Las entradas de `statistics[]` de otras ligas se ignoran, y un jugador sin entradas de la
      liga no se guarda.
    - Se guardan todas las filas de un jugador (una por equipo): RN-017 elige una al leer.
    - Si la API repite el mismo equipo en la liga, queda la entrada con más minutos, porque la
      clave única de estadistica_temporada es jugador + liga + equipo + temporada.
    """
    jugadores: dict[int, DatosJugador] = {}
    equipos: dict[int, DatosEquipo] = {}
    estadisticas: dict[tuple[int, int], DatosEstadistica] = {}
    for item in respuesta:
        jugador = _mapear_jugador(item.get("player") or {})
        if jugador is None:
            continue
        for entrada in item.get("statistics") or []:
            if (entrada.get("league") or {}).get("id") != id_liga_api:
                continue
            equipo = _mapear_equipo(entrada.get("team") or {})
            if equipo is None:
                continue
            estadistica = _mapear_estadistica(
                entrada, jugador.id_api_football, equipo.id_api_football
            )
            clave = (jugador.id_api_football, equipo.id_api_football)
            if clave not in estadisticas or _minutos(estadistica) > _minutos(estadisticas[clave]):
                estadisticas[clave] = estadistica
            jugadores[jugador.id_api_football] = jugador
            equipos[equipo.id_api_football] = equipo
    return DatosDeLiga(
        list(jugadores.values()), list(equipos.values()), list(estadisticas.values())
    )


def mapear_posicion(posicion: str | None) -> Posicion | None:
    """RN-019: las 4 posiciones de API-Football. Otra o vacía → None (dato no disponible)."""
    return POSICIONES_API.get(posicion or "")


def convertir_rating(rating: str | None) -> Decimal | None:
    """`games.rating` viene como string ("7.123456"). Se guarda con 2 decimales o None."""
    if not rating:
        return None
    try:
        return Decimal(rating).quantize(DECIMALES_RATING)
    except InvalidOperation:
        return None


def convertir_fecha(fecha: str | None) -> date | None:
    """`player.birth.date` viene como "AAAA-MM-DD". Si falta o no se entiende, None."""
    if not fecha:
        return None
    try:
        return date.fromisoformat(fecha)
    except ValueError:
        return None


def _mapear_jugador(jugador: dict[str, Any]) -> DatosJugador | None:
    id_api = _entero_no_negativo(jugador.get("id"))
    nombre = _texto(jugador.get("name"), LARGO_NOMBRE)
    if id_api is None or nombre is None:
        return None
    return DatosJugador(
        id_api_football=id_api,
        nombre=nombre,
        nombre_pila=_texto(jugador.get("firstname"), LARGO_NOMBRE_PILA),
        apellido=_texto(jugador.get("lastname"), LARGO_APELLIDO),
        fecha_nacimiento=convertir_fecha((jugador.get("birth") or {}).get("date")),
        nacionalidad=_texto(jugador.get("nationality"), LARGO_NACIONALIDAD),
    )


def _mapear_equipo(equipo: dict[str, Any]) -> DatosEquipo | None:
    id_api = _entero_no_negativo(equipo.get("id"))
    nombre = _texto(equipo.get("name"), LARGO_NOMBRE_EQUIPO)
    if id_api is None or nombre is None:
        return None
    return DatosEquipo(id_api_football=id_api, nombre=nombre)


def _mapear_estadistica(
    entrada: dict[str, Any], id_jugador_api: int, id_equipo_api: int
) -> DatosEstadistica:
    juegos = entrada.get("games") or {}
    goles = entrada.get("goals") or {}
    duelos_totales, duelos_ganados = _duelos(entrada.get("duels") or {})
    return DatosEstadistica(
        id_jugador_api=id_jugador_api,
        id_equipo_api=id_equipo_api,
        posicion=mapear_posicion(juegos.get("position")),
        partidos_jugados=_entero_no_negativo(juegos.get("appearences")),
        minutos_jugados=_entero_no_negativo(juegos.get("minutes")),
        goles=_entero_no_negativo(goles.get("total")),
        asistencias=_entero_no_negativo(goles.get("assists")),
        pases_precision_pct=_porcentaje((entrada.get("passes") or {}).get("accuracy")),
        duelos_totales=duelos_totales,
        duelos_ganados=duelos_ganados,
        rating=convertir_rating(juegos.get("rating")),
        intercepciones=_entero_no_negativo((entrada.get("tackles") or {}).get("interceptions")),
    )


def _duelos(duelos: dict[str, Any]) -> tuple[int | None, int | None]:
    # Más ganados que totales viola el modelo canónico: el par no es confiable
    totales = _entero_no_negativo(duelos.get("total"))
    ganados = _entero_no_negativo(duelos.get("won"))
    if totales is not None and ganados is not None and ganados > totales:
        return None, None
    return totales, ganados


def _porcentaje(valor: Any) -> Decimal | None:
    # passes.accuracy es un % (confirmado el 28/10). Fuera de 0-100 no es un dato válido
    numero = _entero_no_negativo(valor)
    if numero is None or numero > PORCENTAJE_MAXIMO:
        return None
    return Decimal(numero)


def _entero_no_negativo(valor: Any) -> int | None:
    if valor is None or isinstance(valor, bool):
        return None
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return None
    return numero if numero >= 0 else None


def _texto(valor: Any, largo: int) -> str | None:
    if not isinstance(valor, str) or not valor.strip():
        return None
    return valor.strip()[:largo]


def _minutos(estadistica: DatosEstadistica) -> int:
    return -1 if estadistica.minutos_jugados is None else estadistica.minutos_jugados
