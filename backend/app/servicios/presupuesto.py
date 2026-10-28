"""Filtro de presupuesto de la búsqueda (BUS-004, RN-003 y RN-005).

El presupuesto es un monto máximo en EUR que se compara contra el valor de mercado. Es opcional y
arranca apagado (RN-003, supuesto): sin presupuesto no se excluye a nadie.
"""

from sqlalchemy import Select


def entra_en_presupuesto(valor_mercado_eur: int | None, presupuesto_max_eur: int | None) -> bool:
    """RN-005: sin presupuesto entra cualquiera; sin valor no entra; si no, valor <= presupuesto."""
    if presupuesto_max_eur is None:
        return True
    if valor_mercado_eur is None:
        return False
    return valor_mercado_eur <= presupuesto_max_eur


def filtrar_por_presupuesto(consulta: Select, presupuesto_max_eur: int | None) -> Select:
    """RN-005 en SQL: límite inclusivo. Un jugador sin valor queda afuera (NULL <= x es falso)."""
    if presupuesto_max_eur is None:
        return consulta
    return consulta.where(consulta.selected_columns.valor_mercado_eur <= presupuesto_max_eur)


def sin_valor_de_mercado(consulta: Select, presupuesto_max_eur: int | None) -> Select | None:
    """RN-005: de la consulta con todos los demás filtros, los que quedan afuera solo por no
    tener valor (excluidos_sin_valor). None si el presupuesto está apagado."""
    if presupuesto_max_eur is None:
        return None
    return consulta.where(consulta.selected_columns.valor_mercado_eur.is_(None))
