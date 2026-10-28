"""Cobertura de liga (RN-020, supuesto). La calcula la sincronización al terminar cada liga."""

from app.modelos.enums import Cobertura

PROPORCION_MINIMA_CON_PASES = 0.5


def calcular_cobertura(jugadores_con_minutos: int, jugadores_con_pases: int) -> Cobertura:
    """RN-020: sin jugadores con minutos → sin_datos; si menos del 50% tiene pases → basica.

    `jugadores_con_pases` cuenta solo a los que además tienen minutos jugados > 0.
    """
    if jugadores_con_minutos == 0:
        return Cobertura.sin_datos
    if jugadores_con_pases < jugadores_con_minutos * PROPORCION_MINIMA_CON_PASES:
        return Cobertura.basica
    return Cobertura.completa
