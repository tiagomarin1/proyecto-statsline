"""CMP-001: Mejor y Peor (RN-006), cantidad de jugadores (RN-007) y costo aparte."""

import pytest

from app.errores import ErrorApi
from app.servicios.comparacion import (
    comparar_valores,
    marcar_mejor_y_peor,
    validar_cantidad,
)

A, B, C = 1, 2, 3


def test_cmp001_mejor_y_peor():
    mejor, peor = marcar_mejor_y_peor({A: 87, B: 83, C: 80})

    assert (mejor, peor) == ([A], [C])


def test_cmp001_empate_en_el_maximo_marca_a_todos_como_mejor():
    mejor, peor = marcar_mejor_y_peor({A: 87, B: 83, C: 87})

    assert (mejor, peor) == ([A, C], [B])


def test_cmp001_el_que_no_tiene_el_dato_no_compite():
    mejor, peor = marcar_mejor_y_peor({A: 61, B: None, C: 58})

    assert (mejor, peor) == ([A], [C])


def test_cmp001_con_menos_de_2_valores_nadie_se_marca():
    assert marcar_mejor_y_peor({A: 61, B: None, C: None}) == ([], [])


def test_cmp001_empate_total_solo_marca_mejor():
    assert marcar_mejor_y_peor({A: 70, B: 70}) == ([A, B], [])


def test_cmp001_diferencia_de_valor_y_el_mas_barato():
    assert comparar_valores({A: 150_000, B: None, C: 95_000}) == (55_000, C)


def test_cmp001_con_un_solo_valor_no_hay_diferencia_pero_si_el_mas_barato():
    assert comparar_valores({A: None, B: 80_000}) == (None, B)


def test_cmp001_sin_valores_no_hay_diferencia_ni_mas_barato():
    assert comparar_valores({A: None, B: None}) == (None, None)


@pytest.mark.parametrize("ids", [[1], [], [1, 2, 3, 4], [1, 1], [1, 2, 2]])
def test_cmp001_cantidad_invalida_responde_400(ids: list[int]):
    with pytest.raises(ErrorApi) as error:
        validar_cantidad(ids)

    assert error.value.status_code == 400
    assert error.value.codigo == "cantidad_invalida"
    assert error.value.detalle == "Se pueden comparar entre 2 y 3 jugadores."


@pytest.mark.parametrize("ids", [[1, 2], [1, 2, 3]])
def test_cmp001_2_o_3_jugadores_distintos_se_pueden_comparar(ids: list[int]):
    validar_cantidad(ids)
