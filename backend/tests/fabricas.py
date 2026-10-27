"""Fábricas de datos para los tests. Nada de datos sueltos por test (TESTING_STRATEGY.md).

Las métricas de crear_estadistica arrancan en None (dato no disponible): cada test pasa
explícitamente las que necesita. Se pueden sumar fábricas, pero no cambiar las firmas
existentes sin acordarlo (PLAN_BACKEND.md).
"""

from datetime import date
from decimal import Decimal
from itertools import count

from sqlalchemy.orm import Session

from app.modelos import Equipo, EstadisticaTemporada, Jugador, Liga, Usuario
from app.modelos.base import ahora_utc
from app.modelos.enums import Cobertura, Posicion, Rol
from app.seguridad.contrasenas import hashear_contrasena

CONTRASENA_DE_PRUEBA = "contrasena-de-prueba"
_secuencia = count(1)


def _siguiente() -> int:
    return next(_secuencia)


def crear_usuario(
    session: Session,
    *,
    nombre: str = "Javier Ledesma",
    email: str | None = None,
    contrasena: str = CONTRASENA_DE_PRUEBA,
    rol: Rol = Rol.director_tecnico,
    club: str = "Deportivo Norte",
) -> Usuario:
    usuario = Usuario(
        nombre=nombre,
        email=email or f"usuario{_siguiente()}@club.com",
        hash_contrasena=hashear_contrasena(contrasena),
        rol=rol,
        club=club,
        terminos_aceptados_en=ahora_utc(),
    )
    session.add(usuario)
    session.flush()
    return usuario


def crear_liga(
    session: Session,
    *,
    nombre: str | None = None,
    id_api_football: int | None = None,
    temporada_actual: int = 2026,
    cobertura: Cobertura = Cobertura.completa,
    orden: int = 0,
) -> Liga:
    numero = _siguiente()
    liga = Liga(
        nombre=nombre or f"Liga {numero}",
        id_api_football=id_api_football or 10_000 + numero,
        temporada_actual=temporada_actual,
        cobertura=cobertura,
        orden=orden,
    )
    session.add(liga)
    session.flush()
    return liga


def crear_equipo(
    session: Session, *, nombre: str | None = None, id_api_football: int | None = None
) -> Equipo:
    numero = _siguiente()
    equipo = Equipo(
        nombre=nombre or f"Equipo {numero}", id_api_football=id_api_football or 20_000 + numero
    )
    session.add(equipo)
    session.flush()
    return equipo


def crear_jugador(
    session: Session,
    *,
    nombre: str | None = None,
    id_api_football: int | None = None,
    fecha_nacimiento: date | None = date(2003, 4, 12),
    nacionalidad: str | None = "Argentina",
    valor_mercado_eur: int | None = None,
    valor_mercado_fecha: date | None = None,
    id_transfermarkt: int | None = None,
) -> Jugador:
    numero = _siguiente()
    jugador = Jugador(
        nombre=nombre or f"Jugador {numero}",
        id_api_football=id_api_football or 30_000 + numero,
        fecha_nacimiento=fecha_nacimiento,
        nacionalidad=nacionalidad,
        valor_mercado_eur=valor_mercado_eur,
        valor_mercado_fecha=valor_mercado_fecha,
        id_transfermarkt=id_transfermarkt,
    )
    session.add(jugador)
    session.flush()
    return jugador


def crear_estadistica(
    session: Session,
    *,
    jugador: Jugador | None = None,
    liga: Liga | None = None,
    equipo: Equipo | None = None,
    temporada: int | None = None,
    posicion: Posicion | None = Posicion.defensor,
    partidos_jugados: int | None = None,
    minutos_jugados: int | None = None,
    goles: int | None = None,
    asistencias: int | None = None,
    pases_precision_pct: Decimal | float | None = None,
    duelos_totales: int | None = None,
    duelos_ganados: int | None = None,
    rating: Decimal | float | None = None,
    intercepciones: int | None = None,
) -> EstadisticaTemporada:
    """Crea la estadística y, si no se pasan, también el jugador, la liga y el equipo."""
    liga = liga or crear_liga(session)
    estadistica = EstadisticaTemporada(
        jugador_id=(jugador or crear_jugador(session)).id,
        liga_id=liga.id,
        equipo_id=(equipo or crear_equipo(session)).id,
        temporada=temporada or liga.temporada_actual,
        posicion=posicion,
        partidos_jugados=partidos_jugados,
        minutos_jugados=minutos_jugados,
        goles=goles,
        asistencias=asistencias,
        pases_precision_pct=pases_precision_pct,
        duelos_totales=duelos_totales,
        duelos_ganados=duelos_ganados,
        rating=rating,
        intercepciones=intercepciones,
    )
    session.add(estadistica)
    session.flush()
    return estadistica
