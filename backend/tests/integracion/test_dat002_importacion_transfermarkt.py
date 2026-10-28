"""DAT-002: importación del valor de mercado contra PostgreSQL, con la fixture real (RN-002)."""

from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modelos import Jugador, Sincronizacion
from app.modelos.enums import EstadoSincronizacion, OrigenSincronizacion
from app.sincronizacion.transfermarkt import FECHA_DATASET, importar
from tests.fabricas import crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

MUESTRA = Path(__file__).parents[1] / "fixtures" / "transfermarkt" / "players_muestra.csv"


def _jugador_con_nombre_completo(
    session: Session, *, nombre_pila: str, apellido: str, **campos
) -> Jugador:
    """crear_jugador no recibe nombre de pila ni apellido: se completan después."""
    jugador = crear_jugador(session, **campos)
    jugador.nombre_pila = nombre_pila
    jugador.apellido = apellido
    session.flush()
    return jugador


def _colidio(session: Session, **campos) -> Jugador:
    return _jugador_con_nombre_completo(
        session,
        nombre="F. Colidio",
        nombre_pila="Facundo",
        apellido="Colidio",
        fecha_nacimiento=date(2000, 1, 4),
        **campos,
    )


def _recargar(session: Session, jugador: Jugador) -> Jugador:
    session.expire_all()
    return session.get(Jugador, jugador.id)


def test_dat002_coincidencia_unica(session):
    colidio = _colidio(session)

    sincronizacion, _ = importar(session, MUESTRA)

    colidio = _recargar(session, colidio)
    assert colidio.valor_mercado_eur == 5_000_000
    assert colidio.id_transfermarkt == 491705
    assert colidio.valor_mercado_fecha == FECHA_DATASET
    assert sincronizacion.estado == EstadoSincronizacion.ok


def test_dat002_coincidencia_por_palabras_propuesta(session):
    muslera = _jugador_con_nombre_completo(
        session,
        nombre="F. Muslera",
        nombre_pila="Néstor Fernando",
        apellido="Muslera Micol",
        fecha_nacimiento=date(1986, 6, 16),
    )

    importar(session, MUESTRA)

    assert _recargar(session, muslera).valor_mercado_eur == 700_000


def test_dat002_sin_coincidencia_queda_null(session):
    otro = crear_jugador(session, nombre="Jugador Desconocido", fecha_nacimiento=date(2003, 4, 12))

    importar(session, MUESTRA)

    otro = _recargar(session, otro)
    assert otro.valor_mercado_eur is None
    assert otro.id_transfermarkt is None


def test_dat002_coincidencia_ambigua_queda_sin_valor_y_se_informa(session):
    liga = crear_liga(session, nombre="Primera Nacional")
    antonini = _jugador_con_nombre_completo(
        session,
        nombre="J. Antonini",
        nombre_pila="Juan",
        apellido="Antonini",
        fecha_nacimiento=date(1999, 3, 4),
    )
    crear_estadistica(session, jugador=antonini, liga=liga, minutos_jugados=900)

    _, resumen = importar(session, MUESTRA)

    assert _recargar(session, antonini).valor_mercado_eur is None
    assert resumen["Primera Nacional"]["ambiguo"] == 1


def test_dat002_jugador_sin_fecha_de_nacimiento_no_se_cruza(session):
    sin_fecha = _jugador_con_nombre_completo(
        session,
        nombre="F. Colidio",
        nombre_pila="Facundo",
        apellido="Colidio",
        fecha_nacimiento=None,
    )

    _, resumen = importar(session, MUESTRA)

    assert _recargar(session, sin_fecha).valor_mercado_eur is None
    assert resumen["Sin liga"]["sin_fecha"] == 1


def test_dat002_valor_vacio_en_el_csv_queda_sin_valor_pero_cruzado(session):
    castro = _jugador_con_nombre_completo(
        session,
        nombre="N. Castro",
        nombre_pila="Nicolás Eduardo",
        apellido="Castro",
        fecha_nacimiento=date(1990, 5, 11),
    )

    _, resumen = importar(session, MUESTRA)

    castro = _recargar(session, castro)
    assert castro.valor_mercado_eur is None
    assert castro.id_transfermarkt == 441160
    assert resumen["Sin liga"]["cruzado_sin_valor"] == 1


def test_dat002_resumen_por_liga_y_fila_en_sincronizacion(session):
    liga_profesional = crear_liga(session, nombre="Liga Profesional")
    otra_liga = crear_liga(session, nombre="Primera C")
    crear_estadistica(session, jugador=_colidio(session), liga=liga_profesional)
    crear_estadistica(session, jugador=crear_jugador(session), liga=liga_profesional)
    crear_estadistica(session, jugador=crear_jugador(session), liga=otra_liga)

    sincronizacion, resumen = importar(session, MUESTRA)

    assert resumen["Liga Profesional"] == {
        "con_valor": 1,
        "cruzado_sin_valor": 0,
        "sin_coincidencia": 1,
        "ambiguo": 0,
        "sin_fecha": 0,
    }
    assert resumen["Primera C"]["sin_coincidencia"] == 1
    session.expire_all()
    guardada = session.get(Sincronizacion, sincronizacion.id)
    assert guardada.origen == OrigenSincronizacion.transfermarkt
    assert guardada.liga_id is None
    assert guardada.registros_actualizados == 1
    assert guardada.finalizada_en is not None


def test_dat002_correrla_dos_veces_no_duplica_y_actualiza(session):
    colidio = _colidio(session, valor_mercado_eur=1, id_transfermarkt=491705)

    importar(session, MUESTRA)
    importar(session, MUESTRA)

    colidio = _recargar(session, colidio)
    assert colidio.valor_mercado_eur == 5_000_000
    assert (
        session.scalar(
            select(Jugador.id)
            .where(Jugador.id_transfermarkt == 491705)
            .where(Jugador.id != colidio.id)
        )
        is None
    )


def test_dat002_un_jugador_que_ya_no_cruza_pierde_el_valor_anterior(session):
    viejo = crear_jugador(
        session,
        nombre="Jugador Viejo",
        fecha_nacimiento=date(1980, 1, 1),
        valor_mercado_eur=300_000,
        id_transfermarkt=12345,
        valor_mercado_fecha=date(2025, 7, 1),
    )

    importar(session, MUESTRA)

    viejo = _recargar(session, viejo)
    assert viejo.valor_mercado_eur is None
    assert viejo.id_transfermarkt is None
    assert viejo.valor_mercado_fecha is None


def test_dat002_si_el_archivo_falla_no_se_modifica_nada(session, tmp_path):
    colidio = _colidio(session, valor_mercado_eur=1_000_000, id_transfermarkt=491705)
    session.commit()

    sincronizacion, _ = importar(session, tmp_path / "no_existe.csv")

    assert _recargar(session, colidio).valor_mercado_eur == 1_000_000
    guardada = session.get(Sincronizacion, sincronizacion.id)
    assert guardada.estado == EstadoSincronizacion.error
    assert "No existe" in guardada.mensaje_error
    assert session.scalars(
        select(Sincronizacion).where(Sincronizacion.origen == OrigenSincronizacion.transfermarkt)
    ).all() == [guardada]
