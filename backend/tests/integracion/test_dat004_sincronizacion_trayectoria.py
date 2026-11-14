"""DAT-004: sincronización de la trayectoria contra PostgreSQL, con fixtures reales (RN-034)."""

from datetime import timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.integraciones.cliente_api_football import ClienteApiFootball
from app.modelos import Jugador, Sincronizacion, Trayectoria
from app.modelos.base import ahora_utc
from app.modelos.enums import EstadoSincronizacion, OrigenSincronizacion
from app.sincronizacion.trayectoria import ejecutar, sincronizar_trayectorias
from tests.api_football_falsa import ApiFootballFalsa, cargar_fixture
from tests.fabricas import crear_estadistica, crear_jugador

pytestmark = pytest.mark.integracion

CLAVE = "clave-secreta-de-prueba"
VARIOS_CLUBES = 6668  # el id del jugador del fixture players_teams_varios_clubes
CON_SELECCION = 414525
SIN_TEMPORADAS = 361907
UN_SOLO_CLUB = 445035


@pytest.fixture
def api() -> ApiFootballFalsa:
    return ApiFootballFalsa()


@pytest.fixture
def cliente(api: ApiFootballFalsa) -> ClienteApiFootball:
    return ClienteApiFootball(CLAVE, transporte=api.transporte(), dormir=lambda _s: None)


def _responder(api: ApiFootballFalsa, id_api: int, fixture: str) -> None:
    api.responder("/players/teams", {"player": id_api}, cargar_fixture(fixture))


def _pasos(session: Session, jugador: Jugador) -> list[Trayectoria]:
    session.expire_all()
    return list(session.scalars(select(Trayectoria).where(Trayectoria.jugador_id == jugador.id)))


def _jugadores_pedidos(api: ApiFootballFalsa) -> list[int]:
    return [int(p.url.params["player"]) for p in api.pedidos if p.url.path == "/players/teams"]


def test_dat004_se_guarda_la_trayectoria_y_se_marca_al_jugador_como_sincronizado(
    session: Session, api, cliente
):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id)

    pasos = _pasos(session, jugador)
    assert len(pasos) == 17
    assert {p.nombre_club for p in pasos} >= {"Deportivo Merlo", "Chacarita Juniors"}
    assert session.get(Jugador, jugador.id).trayectoria_sincronizada_en is not None


def test_dat004_se_registra_la_corrida_en_sincronizacion(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    sincronizacion = sincronizar_trayectorias(session, cliente, jugador_id=jugador.id)

    guardada = session.get(Sincronizacion, sincronizacion.id)
    assert guardada.origen == OrigenSincronizacion.api_football_trayectoria
    assert guardada.estado == EstadoSincronizacion.ok
    assert guardada.registros_actualizados == 1
    assert guardada.pedidos_usados == 1
    assert guardada.liga_id is None
    assert guardada.finalizada_en is not None


def test_dat004_rn_033_las_selecciones_no_se_guardan(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=CON_SELECCION)
    _responder(api, CON_SELECCION, "players_teams_con_seleccion")

    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id)

    assert {p.nombre_club for p in _pasos(session, jugador)} == {"River Plate"}


def test_dat004_un_club_sin_temporadas_se_guarda_con_temporada_null(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=SIN_TEMPORADAS)
    _responder(api, SIN_TEMPORADAS, "players_teams_club_sin_temporadas")

    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id)

    sin_anio = [p for p in _pasos(session, jugador) if p.temporada is None]
    assert [p.nombre_club for p in sin_anio] == ["Vargas Torres"]


def test_dat004_un_jugador_con_un_solo_club_queda_sincronizado(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=UN_SOLO_CLUB)
    _responder(api, UN_SOLO_CLUB, "players_teams_un_solo_club")

    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id)

    assert {p.nombre_club for p in _pasos(session, jugador)} == {"Brown DE Adrogue"}
    assert session.get(Jugador, jugador.id).trayectoria_sincronizada_en is not None


def test_dat004_volver_a_sincronizar_reemplaza_la_trayectoria_anterior(
    session: Session, api, cliente
):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    session.add(
        Trayectoria(
            jugador_id=jugador.id, id_club_api_football=1, nombre_club="Club viejo", temporada=1999
        )
    )
    session.flush()
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id, forzar=True)

    nombres = {p.nombre_club for p in _pasos(session, jugador)}
    assert "Club viejo" not in nombres
    assert len(_pasos(session, jugador)) == 17


def test_dat004_si_la_api_falla_la_trayectoria_anterior_queda_intacta(
    session: Session, api, cliente
):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    anterior = ahora_utc() - timedelta(days=40)
    jugador.trayectoria_sincronizada_en = anterior
    session.add(
        Trayectoria(
            jugador_id=jugador.id, id_club_api_football=1, nombre_club="Club previo", temporada=2020
        )
    )
    session.flush()
    api.responder("/players/teams", {"player": VARIOS_CLUBES}, 500)

    sincronizacion = sincronizar_trayectorias(session, cliente, jugador_id=jugador.id)

    assert [p.nombre_club for p in _pasos(session, jugador)] == ["Club previo"]
    # No se marca como sincronizado, así que se reintenta en la próxima corrida
    assert session.get(Jugador, jugador.id).trayectoria_sincronizada_en == anterior
    assert sincronizacion.estado == EstadoSincronizacion.error
    assert CLAVE not in sincronizacion.mensaje_error


def test_dat004_rn_034_un_jugador_sincronizado_hace_poco_se_saltea(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    jugador.trayectoria_sincronizada_en = ahora_utc() - timedelta(days=10)
    session.flush()

    sincronizar_trayectorias(session, cliente)

    assert _jugadores_pedidos(api) == []


def test_dat004_rn_034_con_forzar_se_vuelve_a_pedir(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    jugador.trayectoria_sincronizada_en = ahora_utc() - timedelta(days=10)
    session.flush()
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    sincronizar_trayectorias(session, cliente, forzar=True)

    assert _jugadores_pedidos(api) == [VARIOS_CLUBES]


def test_dat004_rn_034_pasados_30_dias_se_vuelve_a_pedir(session: Session, api, cliente):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    jugador.trayectoria_sincronizada_en = ahora_utc() - timedelta(days=31)
    session.flush()
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    sincronizar_trayectorias(session, cliente)

    assert _jugadores_pedidos(api) == [VARIOS_CLUBES]


def test_dat004_un_jugador_que_solo_existe_en_sportmonks_se_saltea(session: Session, api, cliente):
    session.add(Jugador(nombre="Solo Sportmonks", id_sportmonks=700_001))
    session.flush()

    sincronizacion = sincronizar_trayectorias(session, cliente)

    assert _jugadores_pedidos(api) == []
    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert sincronizacion.registros_actualizados == 0


def test_dat004_rn_034_se_empieza_por_los_jugadores_con_mas_minutos(session: Session, api, cliente):
    pocos = crear_jugador(session, id_api_football=101)
    muchos = crear_jugador(session, id_api_football=102)
    medios = crear_jugador(session, id_api_football=103)
    sin_minutos = crear_jugador(session, id_api_football=104)
    crear_estadistica(session, jugador=pocos, minutos_jugados=100)
    crear_estadistica(session, jugador=muchos, minutos_jugados=2900)
    crear_estadistica(session, jugador=medios, minutos_jugados=900)
    crear_estadistica(session, jugador=sin_minutos, minutos_jugados=None)
    for id_api in (101, 102, 103, 104):
        _responder(api, id_api, "players_teams_un_solo_club")

    sincronizar_trayectorias(session, cliente)

    assert _jugadores_pedidos(api) == [102, 103, 101, 104]


def test_dat004_rn_034_el_tope_de_pedidos_corta_la_corrida_y_se_retoma_despues(
    session: Session, api, cliente
):
    jugadores = [crear_jugador(session, id_api_football=200 + n) for n in range(3)]
    for n, jugador in enumerate(jugadores):
        crear_estadistica(session, jugador=jugador, minutos_jugados=3000 - n)
        _responder(api, 200 + n, "players_teams_un_solo_club")

    primera = sincronizar_trayectorias(session, cliente, max_pedidos=2)

    assert _jugadores_pedidos(api) == [200, 201]
    assert primera.registros_actualizados == 2
    assert primera.pedidos_usados == 2
    assert session.get(Jugador, jugadores[2].id).trayectoria_sincronizada_en is None

    api.pedidos.clear()
    sincronizar_trayectorias(session, cliente, max_pedidos=2)

    assert _jugadores_pedidos(api) == [202]


def test_dat004_un_jugador_que_falla_no_frena_a_los_demas(session: Session, api, cliente):
    bueno = crear_jugador(session, id_api_football=301)
    malo = crear_jugador(session, id_api_football=302)
    crear_estadistica(session, jugador=malo, minutos_jugados=2000)
    crear_estadistica(session, jugador=bueno, minutos_jugados=1000)
    api.responder("/players/teams", {"player": 302}, 500)
    _responder(api, 301, "players_teams_un_solo_club")

    sincronizacion = sincronizar_trayectorias(session, cliente)

    assert len(_pasos(session, bueno)) == 3
    assert _pasos(session, malo) == []
    assert sincronizacion.estado == EstadoSincronizacion.error
    assert sincronizacion.registros_actualizados == 1


def test_dat004_si_fallan_muchos_seguidos_se_corta_la_corrida(session: Session, api, cliente):
    jugadores = [crear_jugador(session, id_api_football=400 + n) for n in range(8)]
    for n, jugador in enumerate(jugadores):
        crear_estadistica(session, jugador=jugador, minutos_jugados=3000 - n)
        api.responder("/players/teams", {"player": 400 + n}, 500)

    sincronizacion = sincronizar_trayectorias(session, cliente)

    pedidos = set(_jugadores_pedidos(api))
    assert pedidos == {400, 401, 402, 403, 404}
    assert sincronizacion.estado == EstadoSincronizacion.error
    assert "seguidos" in sincronizacion.mensaje_error


def test_dat004_ejecutar_devuelve_0_si_todo_salio_bien_y_1_si_algo_fallo(
    session: Session, api, cliente
):
    crear_jugador(session, id_api_football=VARIOS_CLUBES)
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    assert ejecutar(session, cliente) == 0

    crear_jugador(session, id_api_football=555)
    api.responder("/players/teams", {"player": 555}, 500)

    assert ejecutar(session, cliente) == 1


def test_dat004_la_cantidad_de_filas_no_cambia_al_repetir_la_corrida(
    session: Session, api, cliente
):
    jugador = crear_jugador(session, id_api_football=VARIOS_CLUBES)
    _responder(api, VARIOS_CLUBES, "players_teams_varios_clubes")

    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id, forzar=True)
    sincronizar_trayectorias(session, cliente, jugador_id=jugador.id, forzar=True)

    total = session.scalar(
        select(func.count()).select_from(Trayectoria).where(Trayectoria.jugador_id == jugador.id)
    )
    assert total == 17
