"""Pasa las estadísticas de temporada de Sportmonks al modelo canónico, sin tocar la base.

Entrada: las filas de `/statistics/seasons/{participant}/{id}` con los includes `player` y `team`.
Cada fila es de un jugador, un equipo y una temporada, con un arreglo `details` de
`{type_id, value}`. Un dato que no viene o que no se puede convertir queda en None, nunca en 0
(RN-008, RN-025). Las métricas derivadas siguen RN-031.
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
TIPO_DUELOS_TOTALES = 105
TIPO_DUELOS_GANADOS = 106
TIPO_INTERCEPCIONES = 100
TIPO_RATING = 118

# RN-019. (supuesto) Los IDs de posición están sin confirmar contra `/core/types`: se verifican
# con la prueba de 14 días (DAT-003, "Qué falta"). Cualquier otro ID, o vacío, queda en None.
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


def mapear_estadisticas(filas: list[dict[str, Any]]) -> DatosDeLigaSportmonks:
    """Mapea todas las filas de estadísticas de una liga y temporada.

    - Una fila sin `player` o sin `team` se ignora: no hay con qué crear el jugador o el equipo.
    - Se guardan todas las filas de un jugador (una por equipo): RN-017 elige una al leer.
    - Si el mismo jugador y equipo se repite, queda la fila con más minutos.
    """
    jugadores: dict[int, JugadorSportmonks] = {}
    equipos: dict[int, EquipoSportmonks] = {}
    estadisticas: dict[tuple[int, int], EstadisticaSportmonks] = {}
    for fila in filas:
        jugador = _mapear_jugador(fila.get("player"))
        equipo = _mapear_equipo(fila.get("team"))
        if jugador is None or equipo is None:
            continue
        estadistica = _mapear_estadistica(fila, jugador.id_sportmonks, equipo.id_sportmonks)
        clave = (jugador.id_sportmonks, equipo.id_sportmonks)
        if clave not in estadisticas or _minutos(estadistica) > _minutos(estadisticas[clave]):
            estadisticas[clave] = estadistica
        jugadores[jugador.id_sportmonks] = jugador
        equipos[equipo.id_sportmonks] = equipo
    return DatosDeLigaSportmonks(
        list(jugadores.values()), list(equipos.values()), list(estadisticas.values())
    )


def contar_jugadores_con_minutos(datos: DatosDeLigaSportmonks) -> int:
    """Jugadores distintos con minutos_jugados > 0 en alguna de sus filas (RN-027)."""
    return len(
        {e.id_jugador_sportmonks for e in datos.estadisticas if (e.minutos_jugados or 0) > 0}
    )


def _mapear_jugador(jugador: dict[str, Any] | None) -> JugadorSportmonks | None:
    if not jugador:
        return None
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


def _mapear_equipo(equipo: dict[str, Any] | None) -> EquipoSportmonks | None:
    if not equipo:
        return None
    id_sm = _entero_no_negativo(equipo.get("id"))
    nombre = _texto(equipo.get("name"), LARGO_NOMBRE_EQUIPO)
    if id_sm is None or nombre is None:
        return None
    return EquipoSportmonks(id_sportmonks=id_sm, nombre=nombre)


def _mapear_estadistica(
    fila: dict[str, Any], id_jugador: int, id_equipo: int
) -> EstadisticaSportmonks:
    detalles = {
        d.get("type_id"): d.get("value") for d in fila.get("details") or [] if isinstance(d, dict)
    }
    pases_totales = _entero_no_negativo(_valor(detalles, TIPO_PASES))
    pases_acertados = _entero_no_negativo(_valor(detalles, TIPO_PASES_ACERTADOS))
    duelos_totales, duelos_ganados = _duelos(
        _entero_no_negativo(_valor(detalles, TIPO_DUELOS_TOTALES)),
        _entero_no_negativo(_valor(detalles, TIPO_DUELOS_GANADOS)),
    )
    return EstadisticaSportmonks(
        id_jugador_sportmonks=id_jugador,
        id_equipo_sportmonks=id_equipo,
        posicion=POSICIONES_SPORTMONKS.get(fila.get("position_id")),
        partidos_jugados=_entero_no_negativo(_valor(detalles, TIPO_PARTIDOS)),
        minutos_jugados=_entero_no_negativo(_valor(detalles, TIPO_MINUTOS)),
        goles=_entero_no_negativo(_valor(detalles, TIPO_GOLES)),
        asistencias=_entero_no_negativo(_valor(detalles, TIPO_ASISTENCIAS)),
        pases_precision_pct=_porcentaje_de_pases(pases_acertados, pases_totales),
        duelos_totales=duelos_totales,
        duelos_ganados=duelos_ganados,
        rating=_rating(_valor(detalles, TIPO_RATING, "average")),
        intercepciones=_entero_no_negativo(_valor(detalles, TIPO_INTERCEPCIONES)),
    )


def _valor(detalles: dict[Any, Any], tipo: int, clave: str = "total") -> Any:
    """El valor de un tipo de estadística: `value.total` (o `value.average` en el rating)."""
    valor = detalles.get(tipo)
    return valor.get(clave) if isinstance(valor, dict) else None


def _porcentaje_de_pases(acertados: int | None, totales: int | None) -> Decimal | None:
    """RN-031: acertados / totales * 100. None si falta alguno, si no hay pases o si da más del
    100 % (no es un dato válido)."""
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
    if valor is None or isinstance(valor, bool):
        return None
    try:
        return Decimal(str(valor)).quantize(DECIMALES_RATING)
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
