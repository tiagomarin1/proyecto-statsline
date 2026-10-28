"""DAT-001: sincronización de API-Football contra PostgreSQL, con fixtures reales (RN-025)."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.integraciones.cliente_api_football import ClienteApiFootball
from app.modelos import Equipo, EstadisticaTemporada, Jugador, Liga, Sincronizacion
from app.modelos.enums import Cobertura, EstadoSincronizacion, Posicion
from app.sincronizacion.api_football import ejecutar, sincronizar_liga
from tests.api_football_falsa import (
    ApiFootballFalsa,
    cargar_fixture,
    partir_en_paginas,
    respuesta_liga_actual,
)
from tests.fabricas import crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

CLAVE = "clave-secreta-de-prueba"


@pytest.fixture
def api() -> ApiFootballFalsa:
    return ApiFootballFalsa()


@pytest.fixture
def cliente_api(api: ApiFootballFalsa) -> ClienteApiFootball:
    return ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=lambda _segundos: None)


@pytest.fixture
def liga_profesional(session: Session) -> Liga:
    return crear_liga(
        session,
        nombre="Liga Profesional",
        id_api_football=128,
        temporada_actual=2025,
        cobertura=Cobertura.sin_datos,
    )


def _paginas_liga_completa() -> list[dict]:
    return partir_en_paginas(cargar_fixture("players_liga_completa_128_2026_p1"), 2)


def _responder_liga_completa(api: ApiFootballFalsa) -> None:
    api.responder("/leagues", {"id": 128, "current": "true"}, respuesta_liga_actual(128))
    api.responder_jugadores(128, 2026, _paginas_liga_completa())


def _cantidad(session: Session, modelo, *condiciones) -> int:
    return session.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def _ultima_sincronizacion(session: Session, liga: Liga) -> Sincronizacion:
    return session.scalars(
        select(Sincronizacion)
        .where(Sincronizacion.liga_id == liga.id)
        .order_by(Sincronizacion.id.desc())
    ).first()


def _jugador(session: Session, id_api_football: int) -> Jugador:
    return session.scalars(select(Jugador).where(Jugador.id_api_football == id_api_football)).one()


def test_dat001_sincronizacion_exitosa_de_una_liga(session, api, cliente_api, liga_profesional):
    _responder_liga_completa(api)

    sincronizacion = sincronizar_liga(session, cliente_api, liga_profesional)

    session.expire_all()
    assert _cantidad(session, Jugador) == 20
    assert _cantidad(session, EstadisticaTemporada, EstadisticaTemporada.temporada == 2026) == 21
    assert _cantidad(session, Equipo) == 10
    arias = _jugador(session, 30)
    estadistica = session.scalars(
        select(EstadisticaTemporada).where(EstadisticaTemporada.jugador_id == arias.id)
    ).one()
    assert estadistica.posicion == Posicion.defensor
    assert estadistica.minutos_jugados == 1572
    assert estadistica.liga_id == liga_profesional.id

    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert sincronizacion.temporada == 2026
    assert sincronizacion.pedidos_usados == 3
    assert sincronizacion.registros_actualizados == 21
    assert sincronizacion.finalizada_en is not None
    assert sincronizacion.mensaje_error is None
    assert liga_profesional.temporada_actual == 2026
    assert liga_profesional.cobertura == Cobertura.completa


def test_dat001_sincronizar_dos_veces_actualiza_sin_duplicar(
    session, api, cliente_api, liga_profesional
):
    _responder_liga_completa(api)
    sincronizar_liga(session, cliente_api, liga_profesional)

    paginas = _paginas_liga_completa()
    paginas[0]["response"][0]["statistics"][0]["games"]["minutes"] = 1600
    api.responder_jugadores(128, 2026, paginas)
    sincronizar_liga(session, cliente_api, liga_profesional)

    session.expire_all()
    assert _cantidad(session, Jugador) == 20
    assert _cantidad(session, EstadisticaTemporada) == 21
    arias = _jugador(session, 30)
    assert (
        session.scalar(
            select(EstadisticaTemporada.minutos_jugados).where(
                EstadisticaTemporada.jugador_id == arias.id
            )
        )
        == 1600
    )


def test_dat001_la_sincronizacion_no_pisa_el_valor_de_mercado(
    session, api, cliente_api, liga_profesional
):
    crear_jugador(session, nombre="Viejo nombre", id_api_football=30, valor_mercado_eur=500_000)
    _responder_liga_completa(api)

    sincronizar_liga(session, cliente_api, liga_profesional)

    session.expire_all()
    arias = _jugador(session, 30)
    assert arias.nombre == "S. Arias"
    assert arias.valor_mercado_eur == 500_000


def test_dat001_metricas_que_la_liga_no_publica_quedan_null(session, api, cliente_api):
    primera_nacional = crear_liga(session, nombre="Primera Nacional", id_api_football=129)
    # La página real dice paging.total = 84: se sirve como única página
    basica = partir_en_paginas(cargar_fixture("players_liga_basica_129_2025_p1"), 1)
    api.responder_jugadores(129, 2025, basica)

    sincronizacion = sincronizar_liga(session, cliente_api, primera_nacional, temporada=2025)

    session.expire_all()
    estadisticas = session.scalars(
        select(EstadisticaTemporada).where(EstadisticaTemporada.liga_id == primera_nacional.id)
    ).all()
    assert len(estadisticas) == 22
    # En la página real solo N. Castro trae pases; nadie trae duelos
    assert sum(e.pases_precision_pct is not None for e in estadisticas) == 1
    assert all(e.duelos_totales is None and e.duelos_ganados is None for e in estadisticas)
    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert sincronizacion.pedidos_usados == 1
    assert primera_nacional.temporada_actual == 2025
    assert primera_nacional.cobertura == Cobertura.basica


def test_dat001_una_liga_sin_jugadores_queda_sin_datos(session, api, cliente_api):
    primera_c = crear_liga(
        session, nombre="Primera C", id_api_football=132, cobertura=Cobertura.basica
    )
    api.responder("/leagues", {"id": 132, "current": "true"}, respuesta_liga_actual(132))
    api.responder_jugadores(132, 2026, [cargar_fixture("players_liga_sin_datos_132_2026_p1")])

    sincronizacion = sincronizar_liga(session, cliente_api, primera_c)

    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert primera_c.cobertura == Cobertura.sin_datos


def test_dat001_si_la_api_falla_a_mitad_de_camino_los_datos_anteriores_quedan_intactos(
    session, api, cliente_api, liga_profesional
):
    liga_profesional.cobertura = Cobertura.completa
    anterior = crear_estadistica(
        session,
        jugador=crear_jugador(session, nombre="S. Arias", id_api_football=30),
        liga=liga_profesional,
        minutos_jugados=999,
    )
    session.commit()
    pagina1, _ = _paginas_liga_completa()
    api.responder("/leagues", {"id": 128, "current": "true"}, respuesta_liga_actual(128))
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, pagina1)
    api.responder("/players", {"league": 128, "season": 2026, "page": 2}, 500)

    sincronizacion = sincronizar_liga(session, cliente_api, liga_profesional)

    session.expire_all()
    assert _cantidad(session, Jugador) == 1
    assert _cantidad(session, EstadisticaTemporada) == 1
    assert session.get(EstadisticaTemporada, anterior.id).minutos_jugados == 999
    liga = session.get(Liga, liga_profesional.id)
    assert liga.cobertura == Cobertura.completa
    assert liga.temporada_actual == 2025

    guardada = _ultima_sincronizacion(session, liga)
    assert guardada.id == sincronizacion.id
    assert guardada.estado == EstadoSincronizacion.error
    assert guardada.pedidos_usados == 6
    assert guardada.finalizada_en is not None
    assert "page=2" in guardada.mensaje_error
    assert CLAVE not in guardada.mensaje_error


def test_dat001_cupo_agotado_se_trata_como_error(session, api, cliente_api, liga_profesional):
    cupo_agotado = {
        **cargar_fixture("players_error_sin_temporada"),
        "errors": {"requests": "You have reached the request limit for the day."},
    }
    api.responder("/players", {"league": 128, "season": 2026, "page": 1}, cupo_agotado)

    sincronizacion = sincronizar_liga(session, cliente_api, liga_profesional, temporada=2026)

    session.expire_all()
    assert sincronizacion.estado == EstadoSincronizacion.error
    assert "request limit" in sincronizacion.mensaje_error
    assert _cantidad(session, Jugador) == 0


def test_dat001_sin_liga_se_sincronizan_todas_y_si_una_falla_las_demas_siguen(
    session, api, cliente_api, liga_profesional
):
    primera_c = crear_liga(session, nombre="Primera C", id_api_football=132, orden=1)
    liga_profesional.orden = 2
    api.responder("/leagues", {"id": 132, "current": "true"}, 500)
    _responder_liga_completa(api)

    codigo_de_salida = ejecutar(session, cliente_api)

    session.expire_all()
    assert codigo_de_salida == 1
    assert _ultima_sincronizacion(session, primera_c).estado == EstadoSincronizacion.error
    assert _ultima_sincronizacion(session, liga_profesional).estado == EstadoSincronizacion.ok
    assert _cantidad(session, Jugador) == 20


def test_dat001_con_liga_se_sincroniza_solo_esa_y_sale_con_0(
    session, api, cliente_api, liga_profesional
):
    otra = crear_liga(session, nombre="Primera C", id_api_football=132)
    _responder_liga_completa(api)

    codigo_de_salida = ejecutar(session, cliente_api, liga_id=liga_profesional.id)

    assert codigo_de_salida == 0
    assert _ultima_sincronizacion(session, otra) is None
    assert _ultima_sincronizacion(session, liga_profesional).estado == EstadoSincronizacion.ok


def test_dat001_una_liga_que_no_existe_sale_con_1(session, cliente_api):
    assert ejecutar(session, cliente_api, liga_id=999_999) == 1
