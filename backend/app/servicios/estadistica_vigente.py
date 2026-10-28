"""Estadística vigente de cada jugador (RN-017) y métricas derivadas (RN-018), en SQL.

La búsqueda filtra y pagina en la base (ENGINEERING_STANDARDS.md §3), así que estas reglas se
arman como expresiones de SQLAlchemy que se agregan a la consulta. También las pueden usar la
ficha (JUG-001) y el comparador (CMP-001), para que haya un solo lugar con cada regla.
"""

from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import ColumnElement, Numeric, Subquery, cast, func, select

from app.modelos import EstadisticaTemporada, Liga

DECIMALES_PORCENTAJE = 0
DECIMALES_RECUPERACIONES = 1
DECIMALES_RATING = 2


def consulta_estadistica_vigente() -> Subquery:
    """RN-017: una fila por jugador, entre las de la temporada actual de cada liga.

    Si tiene más de una (por ejemplo, porque cambió de equipo), gana la de más minutos jugados;
    con empate, la de mayor id.
    """
    orden_de_vigencia = (
        func.row_number()
        .over(
            partition_by=EstadisticaTemporada.jugador_id,
            order_by=(
                EstadisticaTemporada.minutos_jugados.desc().nulls_last(),
                EstadisticaTemporada.id.desc(),
            ),
        )
        .label("orden_de_vigencia")
    )
    candidatas = (
        select(EstadisticaTemporada, orden_de_vigencia)
        .join(Liga, Liga.id == EstadisticaTemporada.liga_id)
        .where(EstadisticaTemporada.temporada == Liga.temporada_actual)
        .subquery("candidatas")
    )
    return select(candidatas).where(candidatas.c.orden_de_vigencia == 1).subquery("vigente")


def duelos_ganados_pct(vigente: Subquery) -> ColumnElement:
    """RN-018: duelos_ganados / duelos_totales * 100. None si falta un dato o no hubo duelos."""
    return cast(vigente.c.duelos_ganados, Numeric) * 100 / func.nullif(vigente.c.duelos_totales, 0)


def recuperaciones_por_partido(vigente: Subquery) -> ColumnElement:
    """RN-018: intercepciones / partidos_jugados. None si falta un dato o no jugó partidos."""
    return cast(vigente.c.intercepciones, Numeric) / func.nullif(vigente.c.partidos_jugados, 0)


def redondear(valor: Decimal | float | None, decimales: int) -> float | None:
    """RN-018: redondeo para mostrar (mitad hacia arriba). Nunca convierte None en 0."""
    if valor is None:
        return None
    cuanto = Decimal(1).scaleb(-decimales)
    return float(Decimal(str(valor)).quantize(cuanto, rounding=ROUND_HALF_UP))
