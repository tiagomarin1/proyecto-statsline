"""DAT-004: la trayectoria de los jugadores se guarda en la base (modelo canónico aprobado)."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modelos import Jugador, Sincronizacion, Trayectoria
from app.modelos.enums import OrigenSincronizacion
from tests.fabricas import crear_jugador

pytestmark = pytest.mark.integracion


def _paso(jugador: Jugador, club: int = 8383, temporada: int | None = 2025, nombre="Merlo"):
    return Trayectoria(
        jugador_id=jugador.id,
        id_club_api_football=club,
        nombre_club=nombre,
        temporada=temporada,
    )


def test_dat004_se_guarda_un_paso_de_la_trayectoria(session: Session):
    jugador = crear_jugador(session)
    session.add(_paso(jugador))
    session.flush()
    session.expire_all()

    paso = session.query(Trayectoria).filter_by(jugador_id=jugador.id).one()
    assert (paso.id_club_api_football, paso.nombre_club, paso.temporada) == (8383, "Merlo", 2025)
    assert paso.sincronizado_en is not None


def test_dat004_un_jugador_arranca_sin_trayectoria_sincronizada(session: Session):
    jugador = crear_jugador(session)
    session.refresh(jugador)

    assert jugador.trayectoria_sincronizada_en is None


def test_dat004_no_se_repite_el_mismo_club_en_la_misma_temporada(session: Session):
    jugador = crear_jugador(session)
    session.add_all([_paso(jugador, temporada=2025), _paso(jugador, temporada=2025)])

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat004_el_mismo_club_en_temporadas_distintas_es_valido(session: Session):
    jugador = crear_jugador(session)
    session.add_all([_paso(jugador, temporada=2024), _paso(jugador, temporada=2025)])

    session.flush()


def test_dat004_un_club_sin_temporada_se_guarda_con_null(session: Session):
    jugador = crear_jugador(session)
    session.add(_paso(jugador, temporada=None))
    session.flush()
    session.expire_all()

    assert session.query(Trayectoria).filter_by(jugador_id=jugador.id).one().temporada is None


def test_dat004_el_null_cuenta_como_un_valor_a_la_hora_de_repetir(session: Session):
    jugador = crear_jugador(session)
    session.add_all([_paso(jugador, temporada=None), _paso(jugador, temporada=None)])

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat004_un_club_puede_tener_filas_con_y_sin_temporada(session: Session):
    jugador = crear_jugador(session)
    session.add_all([_paso(jugador, temporada=None), _paso(jugador, temporada=2025)])

    session.flush()


@pytest.mark.parametrize("temporada", [1899, 2101, 0])
def test_dat004_la_temporada_tiene_que_ser_un_año_razonable(session: Session, temporada: int):
    jugador = crear_jugador(session)
    session.add(_paso(jugador, temporada=temporada))

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat004_la_trayectoria_pertenece_a_un_jugador_que_existe(session: Session):
    session.add(Trayectoria(jugador_id=999_999_999, id_club_api_football=1, nombre_club="X"))

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat004_la_sincronizacion_admite_el_origen_de_trayectoria(session: Session):
    sincronizacion = Sincronizacion(origen=OrigenSincronizacion.api_football_trayectoria)
    session.add(sincronizacion)
    session.flush()
    session.expire_all()

    guardada = session.get(Sincronizacion, sincronizacion.id)
    assert guardada.origen == OrigenSincronizacion.api_football_trayectoria
    assert guardada.liga_id is None
