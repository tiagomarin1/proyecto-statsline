"""INF-001: invariantes del modelo canónico que se garantizan en la base."""

import pytest
from sqlalchemy.exc import DatabaseError, IntegrityError
from sqlalchemy.orm import Session

from app.modelos import EstadisticaTemporada, Seguimiento
from app.modelos.enums import Cobertura
from tests.fabricas import (
    crear_estadistica,
    crear_jugador,
    crear_liga,
    crear_usuario,
)

pytestmark = pytest.mark.integracion


def test_inf001_una_metrica_sin_dato_queda_null_y_no_0(session: Session):
    estadistica = crear_estadistica(session, minutos_jugados=900)
    session.expire_all()

    guardada = session.get(EstadisticaTemporada, estadistica.id)
    assert guardada.minutos_jugados == 900
    assert guardada.pases_precision_pct is None
    assert guardada.duelos_totales is None


def test_inf001_una_liga_nueva_arranca_sin_datos(session: Session):
    liga = crear_liga(session)
    liga_sin_cobertura = type(liga)(nombre="Nueva", id_api_football=1, temporada_actual=2026)
    session.add(liga_sin_cobertura)
    session.flush()
    session.refresh(liga_sin_cobertura)

    assert liga_sin_cobertura.cobertura == Cobertura.sin_datos


def test_inf001_no_se_repite_la_estadistica_de_un_jugador_en_liga_equipo_y_temporada(
    session: Session,
):
    estadistica = crear_estadistica(session)
    duplicada = EstadisticaTemporada(
        jugador_id=estadistica.jugador_id,
        liga_id=estadistica.liga_id,
        equipo_id=estadistica.equipo_id,
        temporada=estadistica.temporada,
    )
    session.add(duplicada)

    with pytest.raises(IntegrityError):
        session.flush()


def test_inf001_duelos_ganados_no_puede_superar_duelos_totales(session: Session):
    with pytest.raises(DatabaseError, match="Check constraint"):
        crear_estadistica(session, duelos_totales=10, duelos_ganados=11)


def test_inf001_los_contadores_no_pueden_ser_negativos(session: Session):
    with pytest.raises(DatabaseError, match="Check constraint"):
        crear_estadistica(session, goles=-1)


def test_inf001_un_jugador_aparece_una_sola_vez_en_el_seguimiento(session: Session):
    usuario = crear_usuario(session)
    jugador = crear_jugador(session)
    session.add(Seguimiento(usuario_id=usuario.id, jugador_id=jugador.id))
    session.flush()
    session.expunge_all()

    session.add(Seguimiento(usuario_id=usuario.id, jugador_id=jugador.id))
    with pytest.raises(IntegrityError):
        session.flush()


def test_inf001_el_email_del_usuario_es_unico(session: Session):
    crear_usuario(session, email="javier@deportivonorte.com")

    with pytest.raises(IntegrityError):
        crear_usuario(session, email="javier@deportivonorte.com")
