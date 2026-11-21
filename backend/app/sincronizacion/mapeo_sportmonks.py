"""Pasa los jugadores de Sportmonks al modelo canónico, sin tocar la base (DAT-003).

Entrada: los equipos de la temporada (`/teams/seasons/{id}`) y los jugadores como los devuelve
`/players/{id}?include=statistics.details&filters=playerStatisticSeasons:{temporada}`: un jugador
con una fila de `statistics` por equipo y temporada, cada una con un arreglo `details` de
`{type_id, value}`. Un dato que no viene o que no se puede convertir queda en None, nunca en 0
(RN-008, RN-025). Las métricas derivadas siguen RN-031. La forma de los datos se confirmó con
respuestas reales el 16/11/2026.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from app.modelos.enums import Posicion
from app.servicios.cruce_sportmonks import JugadorSportmonks

# IDs de los tipos de estadística de jugador (docs.sportmonks.com/v3, `player-statistics`)
TIPO_MINUTOS = 119
TIPO_PARTIDOS = 321
TIPO_GOLES = 52
TIPO_ASISTENCIAS = 79
TIPO_PASES = 80
TIPO_PASES_ACERTADOS = 116
# Sportmonks trae el porcentaje de pases ya calculado en los mismos jugadores que traen pases
TIPO_PORCENTAJE_PASES = 1584
TIPO_DUELOS_TOTALES = 105
TIPO_DUELOS_GANADOS = 106
TIPO_INTERCEPCIONES = 100
TIPO_RATING = 118

# RN-019. En los datos reales de Primera Nacional y Federal A solo aparecen estos cuatro IDs, con
# pocos arqueros en el 24 (16/11/2026). Falta cotejar los nombres contra `/core/types`. Cualquier
# otro ID (por ejemplo 221), o vacío, queda en None.
POSICIONES_SPORTMONKS = {
    24: Posicion.arquero,
    25: Posicion.defensor,
    26: Posicion.mediocampista,
    27: Posicion.delantero,
}

DECIMALES_RATING = Decimal("0.01")
DECIMALES_PORCENTAJE = Decimal("0.01")
PORCENTAJE_MAXIMO = 100

# Largo de las columnas de texto (MODELO_CANONICO_DE_DATOS.md)
LARGO_NOMBRE = 120
LARGO_NOMBRE_PILA = 80
LARGO_APELLIDO = 80
LARGO_NOMBRE_EQUIPO = 120


@dataclass(frozen=True)
class EquipoSportmonks:
    id_sportmonks: int
    nombre: str


@dataclass(frozen=True)
class EstadisticaSportmonks:
    id_jugador_sportmonks: int
    id_equipo_sportmonks: int
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
class DatosDeLigaSportmonks:
    """Lo que se escribe de una liga: cada jugador, equipo y estadística una sola vez."""

    jugadores: list[JugadorSportmonks]
    equipos: list[EquipoSportmonks]
    estadisticas: list[EstadisticaSportmonks]


def mapear_liga(
    equipos: list[dict[str, Any]], jugadores: list[dict[str, Any]], id_temporada: int
) -> DatosDeLigaSportmonks:
    """Mapea los jugadores de una liga y temporada.

    - Solo cuentan las filas de `statistics` de `id_temporada`; un jugador sin ninguna no se
      guarda (no hay estadística que mostrar).
    - Una fila de un equipo que no está en `equipos` se ignora: no hay con qué crear el equipo.
    - Se guardan todas las filas de un jugador (una por equipo): RN-017 elige una al leer.
    - Si el mismo jugador y equipo se repite, queda la fila con más minutos.
    """
    nombres_de_equipos = _nombres_de_equipos(equipos)
    jugadores_mapeados: dict[int, JugadorSportmonks] = {}
    equipos_mapeados: dict[int, EquipoSportmonks] = {}
    estadisticas: dict[tuple[int, int], EstadisticaSportmonks] = {}
    for datos in jugadores:
        jugador = _mapear_jugador(datos)
        if jugador is None:
            continue
        for fila in datos.get("statistics") or []:
            id_equipo = _entero_no_negativo(fila.get("team_id"))
            if fila.get("season_id") != id_temporada or id_equipo not in nombres_de_equipos:
                continue
            estadistica = _mapear_estadistica(fila, datos, jugador.id_sportmonks, id_equipo)
            clave = (jugador.id_sportmonks, id_equipo)
            if clave not in estadisticas or _minutos(estadistica) > _minutos(estadisticas[clave]):
                estadisticas[clave] = estadistica
            jugadores_mapeados[jugador.id_sportmonks] = jugador
            equipos_mapeados[id_equipo] = EquipoSportmonks(id_equipo, nombres_de_equipos[id_equipo])
    return DatosDeLigaSportmonks(
        list(jugadores_mapeados.values()),
        list(equipos_mapeados.values()),
        list(estadisticas.values()),
    )


def contar_jugadores_con_minutos(datos: DatosDeLigaSportmonks) -> int:
    """Jugadores distintos con minutos_jugados > 0 en alguna de sus filas (RN-027)."""
    return len(
        {e.id_jugador_sportmonks for e in datos.estadisticas if (e.minutos_jugados or 0) > 0}
    )


def _nombres_de_equipos(equipos: list[dict[str, Any]]) -> dict[int, str]:
    nombres: dict[int, str] = {}
    for equipo in equipos:
        id_equipo = _entero_no_negativo(equipo.get("id"))
        nombre = _texto(equipo.get("name"), LARGO_NOMBRE_EQUIPO)
        if id_equipo is not None and nombre is not None:
            nombres[id_equipo] = nombre
    return nombres


def _mapear_jugador(jugador: dict[str, Any]) -> JugadorSportmonks | None:
    id_sm = _entero_no_negativo(jugador.get("id"))
    nombre = _texto(jugador.get("name"), LARGO_NOMBRE)
    if id_sm is None or nombre is None:
        return None
    return JugadorSportmonks(
        id_sportmonks=id_sm,
        nombre=nombre,
        nombre_pila=_texto(jugador.get("firstname"), LARGO_NOMBRE_PILA),
        apellido=_texto(jugador.get("lastname"), LARGO_APELLIDO),
        fecha_nacimiento=_fecha(jugador.get("date_of_birth")),
    )


def _mapear_estadistica(
    fila: dict[str, Any], jugador: dict[str, Any], id_jugador: int, id_equipo: int
) -> EstadisticaSportmonks:
    detalles = {
        d.get("type_id"): d.get("value") for d in fila.get("details") or [] if isinstance(d, dict)
    }
    duelos_totales, duelos_ganados = _duelos(
        _entero_no_negativo(_valor(detalles, TIPO_DUELOS_TOTALES)),
        _entero_no_negativo(_valor(detalles, TIPO_DUELOS_GANADOS)),
    )
    id_posicion = fila.get("position_id")
    if id_posicion is None:
        id_posicion = jugador.get("position_id")
    return EstadisticaSportmonks(
        id_jugador_sportmonks=id_jugador,
        id_equipo_sportmonks=id_equipo,
        posicion=POSICIONES_SPORTMONKS.get(id_posicion),
        partidos_jugados=_entero_no_negativo(_valor(detalles, TIPO_PARTIDOS)),
        minutos_jugados=_entero_no_negativo(_valor(detalles, TIPO_MINUTOS)),
        goles=_entero_no_negativo(_valor(detalles, TIPO_GOLES)),
        asistencias=_entero_no_negativo(_valor(detalles, TIPO_ASISTENCIAS)),
        pases_precision_pct=_porcentaje_de_pases(detalles),
        duelos_totales=duelos_totales,
        duelos_ganados=duelos_ganados,
        rating=_rating(_valor(detalles, TIPO_RATING, "average")),
        intercepciones=_entero_no_negativo(_valor(detalles, TIPO_INTERCEPCIONES)),
    )


def _valor(detalles: dict[Any, Any], tipo: int, clave: str = "total") -> Any:
    """El valor de un tipo de estadística: `value.total` (o `value.average` en el rating)."""
    valor = detalles.get(tipo)
    return valor.get(clave) if isinstance(valor, dict) else None


def _porcentaje_de_pases(detalles: dict[Any, Any]) -> Decimal | None:
    """RN-031: el porcentaje que trae Sportmonks si es válido (de 0 a 100); si no, acertados
    sobre totales por 100. None si no hay con qué calcularlo, si no hay pases o si da más de 100."""
    directo = _decimal(_valor(detalles, TIPO_PORCENTAJE_PASES))
    if directo is not None and 0 <= directo <= PORCENTAJE_MAXIMO:
        return directo.quantize(DECIMALES_PORCENTAJE)
    acertados = _entero_no_negativo(_valor(detalles, TIPO_PASES_ACERTADOS))
    totales = _entero_no_negativo(_valor(detalles, TIPO_PASES))
    if acertados is None or not totales:
        return None
    porcentaje = (Decimal(acertados) * 100 / Decimal(totales)).quantize(DECIMALES_PORCENTAJE)
    return porcentaje if porcentaje <= PORCENTAJE_MAXIMO else None


def _duelos(totales: int | None, ganados: int | None) -> tuple[int | None, int | None]:
    # Más ganados que totales viola el modelo canónico: el par no es confiable
    if totales is not None and ganados is not None and ganados > totales:
        return None, None
    return totales, ganados


def _rating(valor: Any) -> Decimal | None:
    numero = _decimal(valor)
    return None if numero is None else numero.quantize(DECIMALES_RATING)


def _decimal(valor: Any) -> Decimal | None:
    if valor is None or isinstance(valor, bool):
        return None
    try:
        return Decimal(str(valor))
    except InvalidOperation:
        return None


def _fecha(valor: Any) -> date | None:
    if not isinstance(valor, str) or not valor:
        return None
    try:
        return date.fromisoformat(valor[:10])
    except ValueError:
        return None


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


def _minutos(estadistica: EstadisticaSportmonks) -> int:
    return -1 if estadistica.minutos_jugados is None else estadistica.minutos_jugados
