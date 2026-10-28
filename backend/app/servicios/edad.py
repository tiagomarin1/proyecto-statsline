"""Edad en años cumplidos (RN-009)."""

from datetime import date, datetime, timedelta, timezone

# Argentina no usa horario de verano: UTC-3 todo el año
ZONA_HORARIA_ARGENTINA = timezone(timedelta(hours=-3))


def obtener_hoy() -> date:
    """La fecha de hoy en Argentina. Es una dependencia para poder fijarla en los tests."""
    return datetime.now(ZONA_HORARIA_ARGENTINA).date()


def _restar_anios(fecha: date, anios: int) -> date:
    try:
        return fecha.replace(year=fecha.year - anios)
    except ValueError:
        # 29 de febrero en un año que no es bisiesto
        return fecha.replace(year=fecha.year - anios, day=28)


def calcular_edad(nacimiento: date | None, hoy: date) -> int | None:
    """RN-009: años cumplidos a hoy. Sin fecha de nacimiento, la edad no está disponible."""
    if nacimiento is None:
        return None
    no_cumplio_este_anio = (hoy.month, hoy.day) < (nacimiento.month, nacimiento.day)
    return hoy.year - nacimiento.year - no_cumplio_este_anio


def rango_fechas_de_nacimiento(
    edad_min: int | None, edad_max: int | None, hoy: date
) -> tuple[date | None, date | None]:
    """RN-009: fechas de nacimiento (desde, hasta), inclusive, de quien tiene entre edad_min y
    edad_max años hoy. Un lado sin edad queda abierto (None)."""
    hasta = _restar_anios(hoy, edad_min) if edad_min is not None else None
    desde = _restar_anios(hoy, edad_max + 1) + timedelta(days=1) if edad_max is not None else None
    return desde, hasta
