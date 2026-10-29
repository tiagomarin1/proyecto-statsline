"""Temporada que se usa en cada liga (RN-027, decidida el 29/10 con el PO).

Se usa la temporada más reciente que tenga al menos 100 jugadores con minutos jugados. Así una
liga del ascenso sigue en la temporada anterior hasta que la nueva tenga un plantel cargado,
en lugar de pasar a una temporada con 2 o 3 jugadores.
"""

UMBRAL_JUGADORES_CON_MINUTOS = 100
# Para no recorrer temporadas viejas sin fin: una liga sin datos en las 3 más nuevas queda
# sin_datos (RN-020)
MAXIMO_TEMPORADAS_A_PROBAR = 3


def alcanza_para_usarse(
    jugadores_con_minutos: int, umbral: int = UMBRAL_JUGADORES_CON_MINUTOS
) -> bool:
    """RN-027: una temporada se usa si tiene al menos `umbral` jugadores con minutos."""
    return jugadores_con_minutos >= umbral
