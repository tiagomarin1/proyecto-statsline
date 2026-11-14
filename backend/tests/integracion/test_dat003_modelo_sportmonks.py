"""DAT-003: el modelo canónico admite una segunda fuente de datos (ADR-0011, propuesta)."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modelos import Equipo, Jugador, Liga, Sincronizacion
from app.modelos.enums import FuenteDatos, OrigenSincronizacion
from tests.fabricas import crear_equipo, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion


def test_dat003_una_liga_nueva_arranca_con_fuente_api_football(session: Session):
    liga = Liga(nombre="Nueva", id_api_football=900_001, temporada_actual=2026)
    session.add(liga)
    session.flush()
    session.refresh(liga)

    assert liga.fuente == FuenteDatos.api_football
    assert liga.id_sportmonks is None


def test_dat003_una_liga_puede_pasar_a_sportmonks_con_su_id(session: Session):
    liga = crear_liga(session)
    liga.fuente = FuenteDatos.sportmonks
    liga.id_sportmonks = 645
    session.flush()
    session.expire_all()

    guardada = session.get(Liga, liga.id)
    assert guardada.fuente == FuenteDatos.sportmonks
    assert guardada.id_sportmonks == 645


def test_dat003_no_se_repite_el_id_sportmonks_de_una_liga(session: Session):
    primera = crear_liga(session)
    primera.id_sportmonks = 645
    session.flush()
    segunda = crear_liga(session)
    segunda.id_sportmonks = 645

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat003_un_jugador_puede_existir_solo_en_sportmonks(session: Session):
    jugador = Jugador(nombre="Lucas Benítez", id_sportmonks=700_002)
    session.add(jugador)
    session.flush()
    session.expire_all()

    guardado = session.get(Jugador, jugador.id)
    assert guardado.id_api_football is None
    assert guardado.id_sportmonks == 700_002


def test_dat003_un_jugador_tiene_que_tener_al_menos_un_id_de_fuente(session: Session):
    session.add(Jugador(nombre="Sin ningún id"))

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat003_no_se_repite_el_id_sportmonks_de_un_jugador(session: Session):
    crear_jugador(session).id_sportmonks = 700_001
    session.flush()
    otro = crear_jugador(session)
    otro.id_sportmonks = 700_001

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat003_un_jugador_puede_tener_los_dos_ids(session: Session):
    jugador = crear_jugador(session, id_api_football=555_001)
    jugador.id_sportmonks = 700_005
    session.flush()
    session.expire_all()

    guardado = session.get(Jugador, jugador.id)
    assert (guardado.id_api_football, guardado.id_sportmonks) == (555_001, 700_005)


def test_dat003_un_equipo_puede_existir_solo_en_sportmonks(session: Session):
    equipo = Equipo(nombre="Club Atlético Norte", id_sportmonks=810)
    session.add(equipo)
    session.flush()
    session.expire_all()

    guardado = session.get(Equipo, equipo.id)
    assert guardado.id_api_football is None
    assert guardado.id_sportmonks == 810


def test_dat003_un_equipo_tiene_que_tener_al_menos_un_id_de_fuente(session: Session):
    session.add(Equipo(nombre="Sin ningún id"))

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat003_no_se_repite_el_id_sportmonks_de_un_equipo(session: Session):
    crear_equipo(session).id_sportmonks = 810
    session.flush()
    otro = crear_equipo(session)
    otro.id_sportmonks = 810

    with pytest.raises(IntegrityError):
        session.flush()


def test_dat003_la_sincronizacion_admite_el_origen_sportmonks(session: Session):
    liga = crear_liga(session)
    sincronizacion = Sincronizacion(origen=OrigenSincronizacion.sportmonks, liga_id=liga.id)
    session.add(sincronizacion)
    session.flush()
    session.expire_all()

    assert session.get(Sincronizacion, sincronizacion.id).origen == OrigenSincronizacion.sportmonks
