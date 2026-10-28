"""Búsqueda de jugadores: BUS-001 (posición y edad), BUS-002 (liga) y BUS-003 (métricas).

Cada filtro es una función que recibe la consulta y la devuelve filtrada (PLAN_BACKEND.md), así
BUS-004 (presupuesto) se engancha con una sola línea en buscar_jugadores.
"""

from datetime import date

from sqlalchemy import RowMapping, Select, and_, exists, or_, select
from sqlalchemy.orm import Session

from app.errores import ErrorApi
from app.esquemas.busqueda import FiltrosBusqueda, JugadorResumen, LigaResumen, RespuestaBusqueda
from app.modelos import Equipo, Jugador, Liga, Seguimiento
from app.modelos.enums import Cobertura, Posicion
from app.repositorios import jugador as repositorio_jugador
from app.repositorios import liga as repositorio_liga
from app.servicios.edad import calcular_edad, rango_fechas_de_nacimiento
from app.servicios.estadistica_vigente import (
    DECIMALES_PORCENTAJE,
    DECIMALES_RATING,
    DECIMALES_RECUPERACIONES,
    consulta_estadistica_vigente,
    duelos_ganados_pct,
    recuperaciones_por_partido,
    redondear,
)

# Filtro de BUS-003 → columna de la consulta con la que se compara (RN-001)
METRICAS_TACTICAS = {
    "pases_min": "pases_precision_pct",
    "duelos_min": "duelos_ganados_pct",
    "recuperaciones_min": "recuperaciones_por_partido",
    "minutos_min": "minutos_jugados",
}


def consulta_base(usuario_id: int) -> Select:
    """Un jugador por fila, con su estadística vigente (RN-017) y las métricas de RN-018."""
    vigente = consulta_estadistica_vigente()
    en_seguimiento = exists().where(
        Seguimiento.usuario_id == usuario_id, Seguimiento.jugador_id == Jugador.id
    )
    return (
        select(
            Jugador.id,
            Jugador.nombre,
            Jugador.fecha_nacimiento,
            Jugador.valor_mercado_eur,
            vigente.c.posicion,
            vigente.c.temporada,
            vigente.c.minutos_jugados,
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
    )


def filtrar_por_posicion(consulta: Select, posicion: Posicion | None) -> Select:
    """BUS-001: sin posición = todas (RN-019)."""
    if posicion is None:
        return consulta
    return consulta.where(consulta.selected_columns.posicion == posicion)


def filtrar_por_liga(consulta: Select, liga_id: int | None) -> Select:
    """BUS-002: la liga de la estadística vigente (RN-017). Sin liga = todas las del MVP."""
    if liga_id is None:
        return consulta
    return consulta.where(consulta.selected_columns.liga_id == liga_id)


def filtrar_por_edad(
    consulta: Select, edad_min: int | None, edad_max: int | None, hoy: date
) -> Select:
    """BUS-001 y RN-009: rango inclusivo. Sin fecha de nacimiento, el jugador queda afuera."""
    desde, hasta = rango_fechas_de_nacimiento(edad_min, edad_max, hoy)
    fecha_nacimiento = consulta.selected_columns.fecha_nacimiento
    if desde is not None:
        consulta = consulta.where(fecha_nacimiento >= desde)
    if hasta is not None:
        consulta = consulta.where(fecha_nacimiento <= hasta)
    return consulta


def _minimos_cargados(filtros: FiltrosBusqueda) -> dict[str, float]:
    return {
        columna: getattr(filtros, filtro)
        for filtro, columna in METRICAS_TACTICAS.items()
        if getattr(filtros, filtro) is not None
    }


def filtrar_por_metricas(consulta: Select, filtros: FiltrosBusqueda) -> Select:
    """BUS-003: cada mínimo se combina con AND. Si falta la métrica, el jugador queda afuera
    (RN-008): en SQL, NULL >= x nunca es verdadero."""
    for columna, minimo in _minimos_cargados(filtros).items():
        consulta = consulta.where(consulta.selected_columns[columna] >= minimo)
    return consulta


def con_dato_faltante(consulta: Select, filtros: FiltrosBusqueda) -> Select | None:
    """RN-008: los que cumplen todos los demás filtros y quedan afuera solo porque no tienen
    alguna métrica filtrada. None si no hay mínimos cargados."""
    minimos = _minimos_cargados(filtros)
    if not minimos:
        return None
    columnas = {nombre: consulta.selected_columns[nombre] for nombre in minimos}
    return consulta.where(
        and_(*(or_(columnas[n].is_(None), columnas[n] >= m) for n, m in minimos.items())),
        or_(*(columna.is_(None) for columna in columnas.values())),
    )


def ordenar(consulta: Select) -> Select:
    """RN-021, orden por defecto: minutos jugados de mayor a menor, nulos al final, y nombre."""
    columnas = consulta.selected_columns
    return consulta.order_by(
        columnas.minutos_jugados.desc().nulls_last(), columnas.nombre, columnas.id
    )


def _a_resumen(fila: RowMapping, hoy: date) -> JugadorResumen:
    return JugadorResumen(
        id=fila["id"],
        nombre=fila["nombre"],
        posicion=fila["posicion"],
        edad=calcular_edad(fila["fecha_nacimiento"], hoy),
        equipo=fila["equipo"],
        liga=LigaResumen(
            id=fila["liga_id"], nombre=fila["liga_nombre"], cobertura=fila["liga_cobertura"]
        ),
        temporada=fila["temporada"],
        minutos_jugados=fila["minutos_jugados"],
        pases_precision_pct=redondear(fila["pases_precision_pct"], DECIMALES_PORCENTAJE),
        duelos_ganados_pct=redondear(fila["duelos_ganados_pct"], DECIMALES_PORCENTAJE),
        recuperaciones_por_partido=redondear(
            fila["recuperaciones_por_partido"], DECIMALES_RECUPERACIONES
        ),
        rating=redondear(fila["rating"], DECIMALES_RATING),
        valor_mercado_eur=fila["valor_mercado_eur"],
        en_seguimiento=fila["en_seguimiento"],
    )


def buscar_jugadores(
    session: Session, filtros: FiltrosBusqueda, usuario_id: int, hoy: date
) -> RespuestaBusqueda:
    liga = None
    if filtros.liga_id is not None:
        liga = repositorio_liga.obtener_por_id(session, filtros.liga_id)
        if liga is None:
            raise ErrorApi(404, "liga_inexistente", "No existe esa liga.")

    consulta = consulta_base(usuario_id)
    consulta = filtrar_por_posicion(consulta, filtros.posicion)
    consulta = filtrar_por_liga(consulta, filtros.liga_id)
    consulta = filtrar_por_edad(consulta, filtros.edad_min, filtros.edad_max, hoy)
    # BUS-004: acá se engancha filtrar_por_presupuesto (servicios/presupuesto.py)
    sin_minimos = consulta
    consulta = filtrar_por_metricas(consulta, filtros)

    total = repositorio_jugador.contar(session, consulta)
    filas = repositorio_jugador.listar(
        session, ordenar(consulta), filtros.tamano, (filtros.pagina - 1) * filtros.tamano
    )
    excluidos = con_dato_faltante(sin_minimos, filtros)

    return RespuestaBusqueda(
        resultados=[_a_resumen(fila, hoy) for fila in filas],
        total=total,
        pagina=filtros.pagina,
        tamano=filtros.tamano,
        excluidos_por_dato_faltante=(
            repositorio_jugador.contar(session, excluidos) if excluidos is not None else 0
        ),
        excluidos_sin_valor=0,
        liga_sin_datos=liga is not None and liga.cobertura == Cobertura.sin_datos,
        sugerencia=None,
    )
