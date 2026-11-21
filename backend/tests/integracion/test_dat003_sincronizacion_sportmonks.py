"""DAT-003: sincronización de Sportmonks contra PostgreSQL, con respuestas falsas de la forma real
(RN-025, RN-027, RN-029, RN-030)."""

from datetime import date
from decimal import Decimal

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.integraciones.cliente_sportmonks import ClienteSportmonks
from app.modelos import Equipo, EstadisticaTemporada, Jugador, Liga, Sincronizacion
from app.modelos.enums import Cobertura, EstadoSincronizacion, FuenteDatos, Posicion
from app.sincronizacion import api_football
from app.sincronizacion.sportmonks import ejecutar, sincronizar_liga
from tests.fabricas import crear_estadistica, crear_jugador, crear_liga
from tests.sportmonks_falsa import (
    SportmonksFalsa,
    equipo,
    estadisticas,
    fila,
    jugador,
    liga,
    plantel,
)

pytestmark = pytest.mark.integracion

TOKEN = "token-secreto-de-prueba"
ID_LIGA_SM = 645
T_2026, T_2025 = 26809, 25000
NORTE, SUR = 810, 820
# RN-027 pide 100 jugadores con minutos; los datos de prueba traen pocos
UMBRAL_DE_PRUEBA = 2


@pytest.fixture
def api() -> SportmonksFalsa:
    return SportmonksFalsa()


@pytest.fixture
def cliente(api: SportmonksFalsa) -> ClienteSportmonks:
    return ClienteSportmonks(TOKEN, transporte=api.transporte(), dormir=lambda _s: None)


@pytest.fixture
def primera_nacional(session: Session) -> Liga:
    return crear_liga(
        session,
        nombre="Primera Nacional",
        id_api_football=129,
        temporada_actual=2025,
        cobertura=Cobertura.basica,
        fuente=FuenteDatos.sportmonks,
        id_sportmonks=ID_LIGA_SM,
    )


def _completo(id_jugador: int, nombre: str, id_equipo: int = NORTE, **extra) -> dict:
    detalles = estadisticas(
        t119=1800, t321=20, t52=1, t79=2, t80=400, t116=320, t105=50, t106=30, t100=12, t118=6.9
    )
    return jugador(
        id_jugador, nombre, filas=[fila(id_equipo, T_2026, detalles, 25)], posicion=25, **extra
    )


def _armar_liga(api: SportmonksFalsa, jugadores: list[dict]) -> None:
    """La liga con dos temporadas y un equipo (Norte) con todos los jugadores dados."""
    api.responder_liga(liga(ID_LIGA_SM, {T_2025: "2025", T_2026: "2026"}))
    api.responder_equipos(
        T_2026, [equipo(NORTE, "Club Atlético Norte"), equipo(SUR, "Deportivo Sur")]
    )
    api.responder_plantel(T_2026, NORTE, plantel(T_2026, NORTE, {j["id"]: True for j in jugadores}))
    api.responder_plantel(T_2026, SUR, [])
    for datos in jugadores:
        api.responder_jugador(datos)


def _cantidad(session: Session, modelo, *condiciones) -> int:
    return session.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def _ultima_sincronizacion(session: Session, liga_: Liga) -> Sincronizacion:
    return session.scalars(
        select(Sincronizacion)
        .where(Sincronizacion.liga_id == liga_.id)
        .order_by(Sincronizacion.id.desc())
    ).first()


def test_dat003_sincroniza_una_liga_completa(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])

    sincronizacion = sincronizar_liga(
        session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA
    )

    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert sincronizacion.origen.value == "sportmonks"
    assert sincronizacion.temporada == 2026
    assert sincronizacion.registros_actualizados == 2
    assert sincronizacion.pedidos_usados == len(api.pedidos)
    assert _cantidad(session, Jugador, Jugador.id_sportmonks.is_not(None)) == 2
    assert _cantidad(session, Equipo, Equipo.id_sportmonks == NORTE) == 1
    assert (
        _cantidad(
            session, EstadisticaTemporada, EstadisticaTemporada.liga_id == primera_nacional.id
        )
        == 2
    )
    # RN-020 y RN-027: la liga queda con cobertura completa y en la temporada elegida
    assert primera_nacional.cobertura == Cobertura.completa
    assert primera_nacional.temporada_actual == 2026


def test_dat003_guarda_las_metricas_y_calcula_el_porcentaje_de_pases(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    e = session.scalars(
        select(EstadisticaTemporada).join(Jugador).where(Jugador.id_sportmonks == 1)
    ).one()
    assert e.temporada == 2026
    assert e.posicion == Posicion.defensor
    assert e.minutos_jugados == 1800
    assert e.pases_precision_pct == Decimal("80.00")
    assert e.rating == Decimal("6.90")


def test_dat003_las_metricas_que_no_vienen_quedan_en_null(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    solo_minutos = jugador(3, "Tomás López", filas=[fila(NORTE, T_2026, estadisticas(t119=900))])
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo"), solo_minutos])

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    e = session.scalars(
        select(EstadisticaTemporada).join(Jugador).where(Jugador.id_sportmonks == 3)
    ).one()
    assert e.minutos_jugados == 900
    assert (e.pases_precision_pct, e.duelos_totales, e.rating, e.goles) == (None,) * 4


def test_dat003_un_jugador_que_ya_esta_en_la_base_recibe_el_id_de_sportmonks(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    existente = crear_jugador(
        session,
        nombre="L. Martínez",
        nombre_pila="Lucas",
        apellido="Martínez",
        fecha_nacimiento=date(1999, 3, 15),
    )
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])
    jugadores_antes = _cantidad(session, Jugador)

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    session.refresh(existente)
    assert existente.id_sportmonks == 1
    # solo se crea el que no existía
    assert _cantidad(session, Jugador) == jugadores_antes + 1
    # y conserva su nombre para mostrar
    assert existente.nombre == "L. Martínez"


def test_dat003_una_coincidencia_ambigua_crea_un_jugador_nuevo(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    fecha = date(1999, 3, 15)
    for _ in range(2):
        crear_jugador(session, nombre="Lucas Martínez", fecha_nacimiento=fecha)
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])
    jugadores_antes = _cantidad(session, Jugador)

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    assert _cantidad(session, Jugador) == jugadores_antes + 2
    assert _cantidad(session, Jugador, Jugador.id_sportmonks == 1) == 1


def test_dat003_no_pide_las_estadisticas_de_quienes_no_tienen(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    jugadores = [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")]
    _armar_liga(api, jugadores)
    api.responder_plantel(T_2026, NORTE, plantel(T_2026, NORTE, {1: True, 2: True, 99: False}))

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    assert not api.pedidos_a("/players/99")


def test_dat003_un_jugador_repetido_en_dos_planteles_se_pide_una_sola_vez(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])
    api.responder_plantel(T_2026, SUR, plantel(T_2026, SUR, {1: True}))

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    assert len(api.pedidos_a("/players/1")) == 1


def test_dat003_si_la_temporada_nueva_no_alcanza_usa_la_anterior(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    api.responder_liga(liga(ID_LIGA_SM, {T_2025: "2025", T_2026: "2026"}))
    # 2026: un solo jugador con minutos (menos que el umbral)
    api.responder_equipos(T_2026, [equipo(NORTE, "Club Atlético Norte")])
    api.responder_plantel(T_2026, NORTE, plantel(T_2026, NORTE, {1: True}))
    api.responder_jugador(_completo(1, "Lucas Martínez"))
    # 2025: dos jugadores con minutos
    api.responder_equipos(T_2025, [equipo(NORTE, "Club Atlético Norte")])
    api.responder_plantel(T_2025, NORTE, plantel(T_2025, NORTE, {1: True, 2: True}))
    detalles_2025 = estadisticas(t119=1500, t80=300, t116=240)
    api.responder(
        "/v3/football/players/1",
        {"data": jugador(1, "Lucas Martínez", filas=[fila(NORTE, T_2025, detalles_2025)])},
    )
    api.responder(
        "/v3/football/players/2",
        {"data": jugador(2, "Joel Gordillo", filas=[fila(NORTE, T_2025, detalles_2025)])},
    )

    sincronizacion = sincronizar_liga(
        session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA
    )

    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert sincronizacion.temporada == 2025
    assert primera_nacional.temporada_actual == 2025


def test_dat003_con_temporada_explicita_no_prueba_las_demas(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    _armar_liga(api, [_completo(1, "Lucas Martínez")])

    sincronizacion = sincronizar_liga(session, cliente, primera_nacional, 2026)

    assert sincronizacion.temporada == 2026
    assert not api.pedidos_a(f"/teams/seasons/{T_2025}")


def test_dat003_una_temporada_que_la_liga_no_tiene_es_un_error(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    api.responder_liga(liga(ID_LIGA_SM, {T_2026: "2026"}))

    sincronizacion = sincronizar_liga(session, cliente, primera_nacional, 2019)

    assert sincronizacion.estado == EstadoSincronizacion.error
    assert "2019" in sincronizacion.mensaje_error


def test_dat003_si_la_api_falla_a_mitad_de_camino_los_datos_anteriores_quedan_intactos(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    previa = crear_estadistica(
        session, liga=primera_nacional, temporada=2026, minutos_jugados=777, pases_precision_pct=50
    )
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])
    api.responder("/v3/football/players/2", 500)

    sincronizacion = sincronizar_liga(session, cliente, primera_nacional, 2026)

    assert sincronizacion.estado == EstadoSincronizacion.error
    assert TOKEN not in sincronizacion.mensaje_error
    assert "500" in sincronizacion.mensaje_error
    session.refresh(previa)
    assert previa.minutos_jugados == 777
    assert _cantidad(session, Jugador, Jugador.id_sportmonks.is_not(None)) == 0
    assert _cantidad(session, Equipo, Equipo.id_sportmonks.is_not(None)) == 0


def test_dat003_el_limite_de_pedidos_espera_y_reintenta(
    session: Session, api: SportmonksFalsa, primera_nacional: Liga
):
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])
    api.responder(
        "/v3/football/players/1",
        429,
        {"data": _completo(1, "Lucas Martínez")},
    )
    esperas: list[float] = []
    cliente = ClienteSportmonks(TOKEN, transporte=_con_retry_after(api), dormir=esperas.append)

    sincronizacion = sincronizar_liga(
        session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA
    )

    assert sincronizacion.estado == EstadoSincronizacion.ok
    assert esperas == [30.0]


def _con_retry_after(api: SportmonksFalsa) -> httpx.MockTransport:
    original = api.transporte()

    def atender(pedido: httpx.Request) -> httpx.Response:
        respuesta = original.handle_request(pedido)
        if respuesta.status_code == 429:
            return httpx.Response(429, headers={"Retry-After": "30"}, json={})
        return respuesta

    return httpx.MockTransport(atender)


def test_dat003_sin_liga_sincroniza_solo_las_ligas_con_fuente_sportmonks(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    otra = crear_liga(session, nombre="Liga Profesional", id_api_football=128)
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])

    codigo = ejecutar(session, cliente, umbral_jugadores=UMBRAL_DE_PRUEBA)

    assert codigo == 0
    assert _ultima_sincronizacion(session, primera_nacional).estado == EstadoSincronizacion.ok
    assert _ultima_sincronizacion(session, otra) is None


def test_dat003_si_una_liga_falla_las_demas_se_procesan_y_el_codigo_es_1(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    federal = crear_liga(
        session,
        nombre="Torneo Federal A",
        id_api_football=134,
        fuente=FuenteDatos.sportmonks,
        id_sportmonks=1333,
        orden=2,
    )
    primera_nacional.orden = 1
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])
    api.responder("/v3/football/leagues/1333", 500)

    codigo = ejecutar(session, cliente, umbral_jugadores=UMBRAL_DE_PRUEBA)

    assert codigo == 1
    assert _ultima_sincronizacion(session, primera_nacional).estado == EstadoSincronizacion.ok
    assert _ultima_sincronizacion(session, federal).estado == EstadoSincronizacion.error


def test_dat003_una_liga_de_api_football_no_se_sincroniza_con_sportmonks(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks
):
    liga_af = crear_liga(session, nombre="Liga Profesional", id_api_football=128)

    codigo = ejecutar(session, cliente, liga_id=liga_af.id)

    assert codigo == 1
    assert not api.pedidos


def test_dat003_la_sincronizacion_de_api_football_saltea_las_ligas_de_sportmonks(
    session: Session, primera_nacional: Liga
):
    class ClienteQueNoDebeUsarse:
        pedidos_usados = 0

        def __getattr__(self, nombre):
            raise AssertionError(f"No debía pedir nada: {nombre}")

    codigo = api_football.ejecutar(session, ClienteQueNoDebeUsarse())

    assert codigo == 0
    assert _ultima_sincronizacion(session, primera_nacional) is None


def test_dat003_un_jugador_nuevo_se_guarda_con_su_nacionalidad(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    nuevo = session.scalars(select(Jugador).where(Jugador.id_sportmonks == 1)).one()
    assert nuevo.nacionalidad == "Argentina"


def test_dat003_un_jugador_cruzado_conserva_su_nacionalidad(
    session: Session, api: SportmonksFalsa, cliente: ClienteSportmonks, primera_nacional: Liga
):
    existente = crear_jugador(
        session,
        nombre="L. Martínez",
        nombre_pila="Lucas",
        apellido="Martínez",
        fecha_nacimiento=date(1999, 3, 15),
        nacionalidad="Uruguay",
    )
    _armar_liga(api, [_completo(1, "Lucas Martínez"), _completo(2, "Joel Gordillo")])

    sincronizar_liga(session, cliente, primera_nacional, umbral_jugadores=UMBRAL_DE_PRUEBA)

    session.refresh(existente)
    assert existente.id_sportmonks == 1
    assert existente.nacionalidad == "Uruguay"
