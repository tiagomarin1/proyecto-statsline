"""Coincidencia del jugador con el perfil guardado o los filtros actuales (RN-012).

Cada criterio es `cumple`, `no_cumple` o `no_disponible`. La función es pura: recibe los datos
del jugador ya leídos de la base.
"""

from dataclasses import dataclass

from app.esquemas.busqueda import FiltrosBusqueda
from app.esquemas.ficha import Coincidencia, CriterioCoincidencia, EstadoCriterio
from app.modelos.enums import Posicion
from app.servicios.busqueda import METRICAS_TACTICAS
from app.servicios.estadistica_vigente import (
    DECIMALES_PORCENTAJE,
    DECIMALES_RECUPERACIONES,
    redondear,
)
from app.servicios.presupuesto import entra_en_presupuesto

# RN-019: nombre de cada posición en la UI
NOMBRES_POSICION = {
    Posicion.arquero: "Arquero",
    Posicion.defensor: "Defensor",
    Posicion.mediocampista: "Mediocampista",
    Posicion.delantero: "Delantero",
}
# Mínimo táctico → (etiqueta, decimales para mostrar). El orden es el de los criterios
MINIMOS_TACTICOS = {
    "pases_min": ("% pases completados", DECIMALES_PORCENTAJE),
    "duelos_min": ("% duelos ganados", DECIMALES_PORCENTAJE),
    "recuperaciones_min": ("Recuperaciones por partido", DECIMALES_RECUPERACIONES),
    "minutos_min": ("Minutos jugados", 0),
}
FILTROS_DE_CRITERIOS = (
    "posicion",
    "edad_min",
    "edad_max",
    "presupuesto_max_eur",
    *MINIMOS_TACTICOS,
)


@dataclass(frozen=True)
class DatosJugadorCoincidencia:
    posicion: Posicion | None
    edad: int | None
    valor_mercado_eur: int | None
    liga: str
    # Sin redondear, como las compara la búsqueda: {columna de METRICAS_TACTICAS: valor}
    metricas: dict[str, float | None]


def evaluar_coincidencia(
    filtros: FiltrosBusqueda, jugador: DatosJugadorCoincidencia
) -> Coincidencia | None:
    """RN-012: posición siempre; edad, presupuesto y cada mínimo táctico solo si se cargaron.

    Devuelve None si no se mandó ningún filtro que sea un criterio (la liga no lo es).
    """
    if all(getattr(filtros, filtro) is None for filtro in FILTROS_DE_CRITERIOS):
        return None
    criterios = [_posicion(filtros.posicion, jugador.posicion)]
    if filtros.edad_min is not None or filtros.edad_max is not None:
        criterios.append(_edad(filtros.edad_min, filtros.edad_max, jugador.edad))
    if filtros.presupuesto_max_eur is not None:
        criterios.append(_presupuesto(filtros.presupuesto_max_eur, jugador.valor_mercado_eur))
    for filtro, (etiqueta, decimales) in MINIMOS_TACTICOS.items():
        minimo = getattr(filtros, filtro)
        if minimo is not None:
            valor = jugador.metricas.get(METRICAS_TACTICAS[filtro])
            criterios.append(_minimo(filtro, etiqueta, decimales, minimo, valor, jugador.liga))
    cumple = sum(criterio.estado == EstadoCriterio.cumple for criterio in criterios)
    return Coincidencia(cumple=cumple, total=len(criterios), criterios=criterios)


def formatear_eur(monto: int) -> str:
    """RN-004: "€ 85.000"."""
    return f"€ {monto:,}".replace(",", ".")


def _criterio(criterio: str, estado: EstadoCriterio, texto: str) -> CriterioCoincidencia:
    return CriterioCoincidencia(criterio=criterio, estado=estado, texto=texto)


def _posicion(buscada: Posicion | None, posicion: Posicion | None) -> CriterioCoincidencia:
    if buscada is None:
        return _criterio("posicion", EstadoCriterio.cumple, "Cualquier posición")
    if posicion is None:
        return _criterio("posicion", EstadoCriterio.no_disponible, "Posición no disponible")
    if posicion == buscada:
        return _criterio(
            "posicion", EstadoCriterio.cumple, f"Juega de {NOMBRES_POSICION[posicion]}"
        )
    texto = f"Juega de {NOMBRES_POSICION[posicion]}, no de {NOMBRES_POSICION[buscada]}"
    return _criterio("posicion", EstadoCriterio.no_cumple, texto)


def _edad(edad_min: int | None, edad_max: int | None, edad: int | None) -> CriterioCoincidencia:
    if edad is None:
        return _criterio("edad", EstadoCriterio.no_disponible, "Edad no disponible")
    # RN-009: los extremos del rango se incluyen
    dentro = (edad_min is None or edad >= edad_min) and (edad_max is None or edad <= edad_max)
    estado = EstadoCriterio.cumple if dentro else EstadoCriterio.no_cumple
    return _criterio("edad", estado, f"Tiene {edad} años ({_rango(edad_min, edad_max)})")


def _rango(edad_min: int | None, edad_max: int | None) -> str:
    if edad_min is not None and edad_max is not None:
        return f"buscás de {edad_min} a {edad_max}"
    if edad_min is not None:
        return f"buscás desde {edad_min}"
    return f"buscás hasta {edad_max}"


def _presupuesto(presupuesto: int, valor: int | None) -> CriterioCoincidencia:
    if valor is None:
        return _criterio("presupuesto", EstadoCriterio.no_disponible, "Costo no disponible")
    estado = (
        EstadoCriterio.cumple
        if entra_en_presupuesto(valor, presupuesto)
        else EstadoCriterio.no_cumple
    )
    texto = f"Vale {formatear_eur(valor)} y el presupuesto es {formatear_eur(presupuesto)}"
    return _criterio("presupuesto", estado, texto)


def _minimo(
    filtro: str, etiqueta: str, decimales: int, minimo: float, valor: float | None, liga: str
) -> CriterioCoincidencia:
    if valor is None:
        # RN-008: el mismo texto que la ficha muestra en la métrica
        return _criterio(filtro, EstadoCriterio.no_disponible, f"{liga} no publica esta métrica.")
    estado = EstadoCriterio.cumple if valor >= minimo else EstadoCriterio.no_cumple
    texto = f"{etiqueta}: {_numero(redondear(valor, decimales))} (mínimo {_numero(minimo)})"
    return _criterio(filtro, estado, texto)


def _numero(valor: float) -> str:
    """Número para la UI: sin decimales de más y con coma decimal (1,9)."""
    return f"{valor:g}".replace(".", ",")
