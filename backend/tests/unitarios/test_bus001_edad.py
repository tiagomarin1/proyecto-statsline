"""BUS-001: edad en años cumplidos y rango de fechas de nacimiento (RN-009)."""

from datetime import date

import pytest

from app.servicios.edad import calcular_edad, obtener_hoy, rango_fechas_de_nacimiento

HOY = date(2026, 10, 27)


@pytest.mark.parametrize(
    ("nacimiento", "edad"),
    [
        (date(2003, 10, 28), 22),  # ejemplo de RN-009: cumple mañana
        (date(2003, 10, 27), 23),  # ejemplo de RN-009: cumple hoy
        (date(2004, 2, 29), 22),
    ],
)
def test_bus001_edad_en_anios_cumplidos(nacimiento: date, edad: int):
    assert calcular_edad(nacimiento, HOY) == edad


def test_bus001_sin_fecha_de_nacimiento_la_edad_no_esta_disponible():
    assert calcular_edad(None, HOY) is None


def test_bus001_el_rango_de_edad_incluye_los_dos_extremos():
    desde, hasta = rango_fechas_de_nacimiento(20, 27, HOY)

    assert calcular_edad(desde, HOY) == 27
    assert calcular_edad(desde.replace(day=desde.day - 1), HOY) == 28
    assert calcular_edad(hasta, HOY) == 20
    assert calcular_edad(hasta.replace(day=hasta.day + 1), HOY) == 19


def test_bus001_sin_edad_minima_o_maxima_ese_lado_queda_abierto():
    assert rango_fechas_de_nacimiento(None, None, HOY) == (None, None)
    assert rango_fechas_de_nacimiento(20, None, HOY)[0] is None
    assert rango_fechas_de_nacimiento(None, 27, HOY)[1] is None


def test_bus001_el_29_de_febrero_no_rompe_el_rango():
    desde, hasta = rango_fechas_de_nacimiento(20, 27, date(2028, 2, 29))

    assert calcular_edad(hasta, date(2028, 2, 29)) == 20
    assert calcular_edad(desde, date(2028, 2, 29)) == 27


def test_bus001_el_29_de_febrero_contra_un_anio_no_bisiesto():
    # 29/2/2028 menos 21 años cae en 2007, que no es bisiesto: se usa el 28/2
    hasta = rango_fechas_de_nacimiento(21, None, date(2028, 2, 29))[1]

    assert hasta == date(2007, 2, 28)
    assert calcular_edad(hasta, date(2028, 2, 29)) == 21


def test_bus001_hoy_es_la_fecha_de_argentina():
    assert abs((obtener_hoy() - date.today()).days) <= 1
