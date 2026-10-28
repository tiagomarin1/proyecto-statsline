"""Ficha individual de un jugador (JUG-001).

Usa la estadística vigente (RN-017) y las métricas derivadas (RN-018) de estadistica_vigente.py,
el promedio de la posición (RN-015) y la coincidencia con el perfil (RN-012).
"""

from datetime import date

from sqlalchemy import Select, exists, func, select
from sqlalchemy.orm import Session

from app.errores import ErrorApi
from app.esquemas.busqueda import FiltrosBusqueda, LigaResumen
from app.esquemas.ficha import FichaJugador, Metricas, PromediosPosicion, ValorMercado
from app.modelos import Equipo, Jugador, Liga, Seguimiento
from app.modelos.enums import Posicion
from app.repositorios import jugador as repositorio_jugador
from app.servicios.coincidencia import DatosJugadorCoincidencia, evaluar_coincidencia
from app.servicios.edad import calcular_edad
from app.servicios.estadistica_vigente import (
    DECIMALES_PORCENTAJE,
    DECIMALES_RATING,
    DECIMALES_RECUPERACIONES,
    consulta_estadistica_vigente,
    duelos_ganados_pct,
    recuperaciones_por_partido,
    redondear,
)

# El promedio de un contador (minutos, goles...) no es entero: se muestra con 1 decimal
DECIMALES_PROMEDIO_CONTADOR = 1
# Métrica de RN-001 → decimales para mostrarla (None = entero, sin redondeo)
METRICAS_FICHA = {
    "partidos_jugados": None,
    "minutos_jugados": None,
    "goles": None,
    "asistencias": None,
    "pases_precision_pct": DECIMALES_PORCENTAJE,
    "duelos_ganados_pct": DECIMALES_PORCENTAJE,
    "recuperaciones_por_partido": DECIMALES_RECUPERACIONES,
    "rating": DECIMALES_RATING,
}
MENSAJE_JUGADOR_INEXISTENTE = "No encontramos a ese jugador."


def obtener_ficha(
    session: Session, jugador_id: int, usuario_id: int, filtros: FiltrosBusqueda, hoy: date
) -> FichaJugador:
    """404 jugador_inexistente si no existe o no tiene estadística en la temporada actual de su
    liga (no aparecería en la búsqueda), igual que el comparador."""
    filas = repositorio_jugador.listar(session, _consulta_ficha(jugador_id, usuario_id), 1, 0)
    if not filas:
        raise ErrorApi(404, "jugador_inexistente", MENSAJE_JUGADOR_INEXISTENTE)
    fila = filas[0]
    edad = calcular_edad(fila["fecha_nacimiento"], hoy)
    datos_coincidencia = DatosJugadorCoincidencia(
        posicion=fila["posicion"],
        edad=edad,
        valor_mercado_eur=fila["valor_mercado_eur"],
        liga=fila["liga_nombre"],
        metricas={metrica: _a_float(fila[metrica]) for metrica in METRICAS_FICHA},
    )
    return FichaJugador(
        id=fila["id"],
        nombre=fila["nombre"],
        posicion=fila["posicion"],
        edad=edad,
        fecha_nacimiento=fila["fecha_nacimiento"],
        nacionalidad=fila["nacionalidad"],
        equipo=fila["equipo"],
        liga=LigaResumen(
            id=fila["liga_id"], nombre=fila["liga_nombre"], cobertura=fila["liga_cobertura"]
        ),
        temporada=fila["temporada"],
        metricas=Metricas(
            **{
                metrica: fila[metrica] if decimales is None else redondear(fila[metrica], decimales)
                for metrica, decimales in METRICAS_FICHA.items()
            }
        ),
        promedios_posicion=_promedios_posicion(session, fila["posicion"]),
        valor_mercado=_valor_mercado(fila["valor_mercado_eur"], fila["valor_mercado_fecha"]),
        en_seguimiento=fila["en_seguimiento"],
        coincidencia=evaluar_coincidencia(filtros, datos_coincidencia),
    )


def _consulta_ficha(jugador_id: int, usuario_id: int) -> Select:
    vigente = consulta_estadistica_vigente()
    en_seguimiento = exists().where(
        Seguimiento.usuario_id == usuario_id, Seguimiento.jugador_id == Jugador.id
    )
    return (
        select(
            Jugador.id,
            Jugador.nombre,
            Jugador.fecha_nacimiento,
            Jugador.nacionalidad,
            Jugador.valor_mercado_eur,
            Jugador.valor_mercado_fecha,
            vigente.c.posicion,
            vigente.c.temporada,
            vigente.c.partidos_jugados,
            vigente.c.minutos_jugados,
            vigente.c.goles,
            vigente.c.asistencias,
            vigente.c.pases_precision_pct,
            vigente.c.rating,
            duelos_ganados_pct(vigente).label("duelos_ganados_pct"),
            recuperaciones_por_partido(vigente).label("recuperaciones_por_partido"),
            Liga.id.label("liga_id"),
            Liga.nombre.label("liga_nombre"),
            Liga.cobertura.label("liga_cobertura"),
            Equipo.nombre.label("equipo"),
            en_seguimiento.label("en_seguimiento"),
        )
        .join(vigente, vigente.c.jugador_id == Jugador.id)
        .join(Liga, Liga.id == vigente.c.liga_id)
        .join(Equipo, Equipo.id == vigente.c.equipo_id)
        .where(Jugador.id == jugador_id)
    )


def _consulta_promedios(posicion: Posicion) -> Select:
    """RN-015: promedio entre los jugadores de la misma posición, con su estadística vigente
    de la temporada actual de todas las ligas. AVG ignora los nulos y da NULL si nadie tiene el
    dato."""
    vigente = consulta_estadistica_vigente()
    columnas = {
        **{nombre: vigente.c[nombre] for nombre in METRICAS_FICHA if nombre in vigente.c},
        "duelos_ganados_pct": duelos_ganados_pct(vigente),
        "recuperaciones_por_partido": recuperaciones_por_partido(vigente),
    }
    return select(*(func.avg(columna).label(nombre) for nombre, columna in columnas.items())).where(
        vigente.c.posicion == posicion
    )


def _promedios_posicion(session: Session, posicion: Posicion | None) -> PromediosPosicion:
    if posicion is None:
        return PromediosPosicion(**dict.fromkeys(METRICAS_FICHA))
    [fila] = repositorio_jugador.listar(session, _consulta_promedios(posicion), 1, 0)
    return PromediosPosicion(
        **{
            metrica: redondear(
                fila[metrica], DECIMALES_PROMEDIO_CONTADOR if decimales is None else decimales
            )
            for metrica, decimales in METRICAS_FICHA.items()
        }
    )


def _valor_mercado(eur: int | None, fecha: date | None) -> ValorMercado | None:
    """RN-002: sin valor, la ficha muestra "Costo no disponible"."""
    return ValorMercado(eur=eur, fecha=fecha) if eur is not None else None


def _a_float(valor) -> float | None:
    return float(valor) if valor is not None else None
