"""Comparador de 2 o 3 jugadores (CMP-001). No guarda nada: el historial es R3."""

from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.errores import ErrorApi
from app.esquemas.busqueda import LigaResumen
from app.esquemas.comparacion import FilaComparacion, JugadorComparado, RespuestaComparacion
from app.modelos import Equipo, Jugador, Liga
from app.repositorios import jugador as repositorio_jugador
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

MIN_JUGADORES_COMPARACION = 2
MAX_JUGADORES_COMPARACION = 3
MENSAJE_CANTIDAD_INVALIDA = "Se pueden comparar entre 2 y 3 jugadores."

# RN-001: métricas de rendimiento del comparador, en orden, con su etiqueta y redondeo (RN-018).
# Todas son "mayor es mejor" (RN-006). El valor de mercado no compite: va aparte.
METRICAS_COMPARADOR = (
    ("minutos_jugados", "Minutos jugados", None),
    ("partidos_jugados", "Partidos jugados", None),
    ("goles", "Goles", None),
    ("asistencias", "Asistencias", None),
    ("pases_precision_pct", "% pases completados", DECIMALES_PORCENTAJE),
    ("duelos_ganados_pct", "% duelos ganados", DECIMALES_PORCENTAJE),
    ("recuperaciones_por_partido", "Recuperaciones por partido", DECIMALES_RECUPERACIONES),
    ("rating", "Rating", DECIMALES_RATING),
)


def validar_cantidad(jugador_ids: list[int]) -> None:
    """RN-007: entre 2 y 3 jugadores, sin repetidos. Si no, 400 cantidad_invalida."""
    cantidad_valida = MIN_JUGADORES_COMPARACION <= len(jugador_ids) <= MAX_JUGADORES_COMPARACION
    if not cantidad_valida or len(set(jugador_ids)) != len(jugador_ids):
        raise ErrorApi(400, "cantidad_invalida", MENSAJE_CANTIDAD_INVALIDA)


def marcar_mejor_y_peor(valores: dict[int, float | None]) -> tuple[list[int], list[int]]:
    """RN-006: "Mejor" es el máximo y "Peor" el mínimo; los empates se marcan todos.

    Quien no tiene el dato no compite. Con menos de 2 valores no se marca a nadie, y con un empate
    total solo se marca "Mejor".
    """
    disponibles = {jugador: valor for jugador, valor in valores.items() if valor is not None}
    if len(disponibles) < 2:
        return [], []
    maximo, minimo = max(disponibles.values()), min(disponibles.values())
    mejor = [jugador for jugador, valor in disponibles.items() if valor == maximo]
    peor = [] if maximo == minimo else [j for j, v in disponibles.items() if v == minimo]
    return mejor, peor


def comparar_valores(valores: dict[int, int | None]) -> tuple[int | None, int | None]:
    """RN-006: el valor de mercado no compite. Devuelve (diferencia_valor_eur, mas_barato_id).

    La diferencia es el más caro menos el más barato entre los que tienen valor; si tienen valor
    menos de 2, no hay diferencia. El más barato es None solo si nadie tiene valor.
    """
    con_valor = {jugador: valor for jugador, valor in valores.items() if valor is not None}
    if not con_valor:
        return None, None
    mas_barato = min(con_valor, key=con_valor.get)
    diferencia = max(con_valor.values()) - min(con_valor.values()) if len(con_valor) >= 2 else None
    return diferencia, mas_barato


def _consulta_jugadores(jugador_ids: list[int]) -> Select:
    vigente = consulta_estadistica_vigente()
    return (
        select(
            Jugador.id,
            Jugador.nombre,
            Jugador.fecha_nacimiento,
            Jugador.valor_mercado_eur,
            vigente.c.posicion,
            vigente.c.temporada,
            vigente.c.minutos_jugados,
            vigente.c.partidos_jugados,
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
        )
        .join(vigente, vigente.c.jugador_id == Jugador.id)
        .join(Liga, Liga.id == vigente.c.liga_id)
        .join(Equipo, Equipo.id == vigente.c.equipo_id)
        .where(Jugador.id.in_(jugador_ids))
    )


def comparar(session: Session, jugador_ids: list[int], hoy: date) -> RespuestaComparacion:
    """CMP-001: compara 2 o 3 jugadores con su estadística vigente (RN-017).

    404 jugador_inexistente si alguno no existe o no tiene estadística en la temporada actual de
    su liga (no aparecería en la búsqueda).
    """
    validar_cantidad(jugador_ids)
    filas = repositorio_jugador.listar(
        session, _consulta_jugadores(jugador_ids), len(jugador_ids), 0
    )
    por_id = {fila["id"]: fila for fila in filas}
    if len(por_id) != len(jugador_ids):
        raise ErrorApi(404, "jugador_inexistente", "No encontramos a uno de los jugadores.")
    ordenadas = [por_id[jugador_id] for jugador_id in jugador_ids]

    filas_comparacion = []
    ganadas = {jugador_id: 0 for jugador_id in jugador_ids}
    for metrica, etiqueta, decimales in METRICAS_COMPARADOR:
        # Se compara lo mismo que se muestra: el valor ya redondeado (RN-018)
        valores = {
            fila["id"]: fila[metrica] if decimales is None else redondear(fila[metrica], decimales)
            for fila in ordenadas
        }
        mejor, peor = marcar_mejor_y_peor(valores)
        for jugador_id in mejor:
            ganadas[jugador_id] += 1
        filas_comparacion.append(
            FilaComparacion(
                metrica=metrica,
                etiqueta=etiqueta,
                valores=list(valores.values()),
                mejor=mejor,
                peor=peor,
            )
        )

    diferencia, mas_barato = comparar_valores(
        {fila["id"]: fila["valor_mercado_eur"] for fila in ordenadas}
    )
    return RespuestaComparacion(
        jugadores=[_a_comparado(fila, hoy) for fila in ordenadas],
        filas=filas_comparacion,
        metricas_ganadas={str(jugador_id): total for jugador_id, total in ganadas.items()},
        diferencia_valor_eur=diferencia,
        mas_barato_id=mas_barato,
    )


def _a_comparado(fila, hoy: date) -> JugadorComparado:
    return JugadorComparado(
        id=fila["id"],
        nombre=fila["nombre"],
        posicion=fila["posicion"],
        edad=calcular_edad(fila["fecha_nacimiento"], hoy),
        equipo=fila["equipo"],
        liga=LigaResumen(
            id=fila["liga_id"], nombre=fila["liga_nombre"], cobertura=fila["liga_cobertura"]
        ),
        temporada=fila["temporada"],
        valor_mercado_eur=fila["valor_mercado_eur"],
    )
