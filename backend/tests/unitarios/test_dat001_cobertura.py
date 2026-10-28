"""DAT-001: cobertura de liga (RN-020)."""

import pytest

from app.modelos.enums import Cobertura
from app.servicios.cobertura import calcular_cobertura


@pytest.mark.parametrize(
    ("jugadores_con_minutos", "jugadores_con_pases", "esperada"),
    [
        (0, 0, Cobertura.sin_datos),
        (10, 0, Cobertura.basica),
        (10, 4, Cobertura.basica),
        (10, 5, Cobertura.completa),
        (10, 10, Cobertura.completa),
        (3, 1, Cobertura.basica),
    ],
)
def test_dat001_rn020_cobertura_de_liga(jugadores_con_minutos, jugadores_con_pases, esperada):
    assert calcular_cobertura(jugadores_con_minutos, jugadores_con_pases) == esperada
