"""BUS-001, BUS-002 y BUS-003: GET /api/v1/jugadores con filtros (RN-008, RN-009, RN-017,
RN-018, RN-020, RN-024) y GET /api/v1/ligas."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos import Seguimiento
from app.modelos.enums import Cobertura, Posicion
from app.servicios.edad import obtener_hoy
from tests.fabricas import crear_equipo, crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/jugadores"
HOY = date(2026, 10, 27)


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: HOY


def _nombres(respuesta) -> list[str]:
    return [jugador["nombre"] for jugador in respuesta.json()["resultados"]]


def _jugador_con(session: Session, nombre: str, *, nacimiento=date(2002, 1, 1), **estadistica):
    jugador = crear_jugador(session, nombre=nombre, fecha_nacimiento=nacimiento)
    return crear_estadistica(session, jugador=jugador, **estadistica)


# --- Seguridad ---


def test_bus001_sin_sesion_responde_401(cliente: TestClient):
    assert cliente.get(URL).status_code == 401
    assert cliente.get("/api/v1/ligas").status_code == 401


# --- BUS-001: posición y edad ---


def test_bus001_posicion_y_rango_de_edad_incluyen_los_extremos(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con(session, "Cumple 20 hoy", nacimiento=date(2006, 10, 27), liga=liga)
    _jugador_con(session, "Tiene 27", nacimiento=date(1998, 10, 28), liga=liga)
    _jugador_con(session, "Cumple 28 hoy", nacimiento=date(1998, 10, 27), liga=liga)
    _jugador_con(session, "Tiene 19", nacimiento=date(2006, 10, 28), liga=liga)
    _jugador_con(session, "Delantero de 24", posicion=Posicion.delantero, liga=liga)

    respuesta = cliente_con_sesion.get(
        URL, params={"posicion": "defensor", "edad_min": 20, "edad_max": 27}
    )

    assert respuesta.status_code == 200
    assert sorted(_nombres(respuesta)) == ["Cumple 20 hoy", "Tiene 27"]
    assert {j["edad"] for j in respuesta.json()["resultados"]} == {20, 27}


def test_bus001_liga_posicion_y_edad_se_combinan_con_and(
    cliente_con_sesion: TestClient, session: Session
):
    nacional, metro = crear_liga(session), crear_liga(session)
    _jugador_con(session, "Cumple todo", liga=nacional)
    _jugador_con(session, "Otra liga", liga=metro)
    _jugador_con(session, "Otra posición", liga=nacional, posicion=Posicion.arquero)
    _jugador_con(session, "Muy grande", liga=nacional, nacimiento=date(1980, 1, 1))

    respuesta = cliente_con_sesion.get(
        URL,
        params={"liga_id": nacional.id, "posicion": "defensor", "edad_min": 20, "edad_max": 30},
    )

    assert _nombres(respuesta) == ["Cumple todo"]


def test_bus001_rango_de_edad_invertido_responde_422(cliente_con_sesion: TestClient):
    respuesta = cliente_con_sesion.get(URL, params={"edad_min": 30, "edad_max": 25})

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"


def test_bus001_jugador_sin_fecha_de_nacimiento_queda_afuera_con_filtro_de_edad(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con(session, "Sin fecha", nacimiento=None, liga=liga)
    _jugador_con(session, "Con fecha", liga=liga)

    con_filtro = cliente_con_sesion.get(URL, params={"edad_min": 18, "edad_max": 40})
    sin_filtro = cliente_con_sesion.get(URL)

    assert _nombres(con_filtro) == ["Con fecha"]
    assert sorted(_nombres(sin_filtro)) == ["Con fecha", "Sin fecha"]
    sin_fecha = next(j for j in sin_filtro.json()["resultados"] if j["nombre"] == "Sin fecha")
    assert sin_fecha["edad"] is None


def test_bus001_sin_posicion_trae_todas(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    for posicion in Posicion:
        _jugador_con(session, f"Un {posicion.value}", posicion=posicion, liga=liga)

    respuesta = cliente_con_sesion.get(URL, params={"posicion": ""})

    assert respuesta.json()["total"] == 4


# --- BUS-002: liga ---


def test_bus002_la_liga_se_filtra_por_la_estadistica_vigente(
    cliente_con_sesion: TestClient, session: Session
):
    # RN-017: si jugó en dos ligas, cuenta la fila con más minutos
    metro, nacional = crear_liga(session), crear_liga(session)
    jugador = crear_jugador(session, nombre="Pasó de Metro a Nacional")
    crear_estadistica(session, jugador=jugador, liga=metro, minutos_jugados=300)
    crear_estadistica(session, jugador=jugador, liga=nacional, minutos_jugados=1200)

    en_metro = cliente_con_sesion.get(URL, params={"liga_id": metro.id})
    en_nacional = cliente_con_sesion.get(URL, params={"liga_id": nacional.id})

    assert _nombres(en_metro) == []
    assert _nombres(en_nacional) == ["Pasó de Metro a Nacional"]
    assert en_nacional.json()["resultados"][0]["minutos_jugados"] == 1200


def test_bus002_con_empate_de_minutos_gana_la_fila_mas_nueva(
    cliente_con_sesion: TestClient, session: Session
):
    jugador = crear_jugador(session, nombre="Empate")
    crear_estadistica(session, jugador=jugador, minutos_jugados=900)
    segunda = crear_estadistica(session, jugador=jugador, minutos_jugados=900)

    respuesta = cliente_con_sesion.get(URL)

    assert respuesta.json()["total"] == 1
    assert respuesta.json()["resultados"][0]["liga"]["id"] == segunda.liga_id


def test_bus002_solo_cuenta_la_temporada_actual_de_cada_liga(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session, temporada_actual=2026)
    _jugador_con(session, "Temporada actual", liga=liga)
    _jugador_con(session, "Temporada pasada", liga=liga, temporada=2025)

    assert _nombres(cliente_con_sesion.get(URL)) == ["Temporada actual"]


def test_bus002_sin_coincidencias_devuelve_lista_vacia(
    cliente_con_sesion: TestClient, session: Session
):
    _jugador_con(session, "Defensor", liga=crear_liga(session))

    respuesta = cliente_con_sesion.get(URL, params={"posicion": "arquero"})

    assert respuesta.status_code == 200
    assert respuesta.json()["resultados"] == []
    assert respuesta.json()["total"] == 0


def test_bus002_liga_sin_datos_lo_informa(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session, cobertura=Cobertura.sin_datos)

    respuesta = cliente_con_sesion.get(URL, params={"liga_id": liga.id})

    assert respuesta.json()["liga_sin_datos"] is True
    assert respuesta.json()["resultados"] == []


def test_bus002_liga_con_datos_basicos_viaja_en_cada_jugador(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session, nombre="Primera C", cobertura=Cobertura.basica)
    _jugador_con(session, "De la C", liga=liga)

    jugador = cliente_con_sesion.get(URL).json()["resultados"][0]

    assert jugador["liga"] == {"id": liga.id, "nombre": "Primera C", "cobertura": "basica"}


def test_bus002_liga_inexistente_responde_404(cliente_con_sesion: TestClient):
    respuesta = cliente_con_sesion.get(URL, params={"liga_id": 999_999})

    assert respuesta.status_code == 404
    assert respuesta.json()["codigo"] == "liga_inexistente"


def test_bus002_las_ligas_se_listan_en_orden(cliente_con_sesion: TestClient, session: Session):
    segunda = crear_liga(session, nombre="Primera Nacional", orden=2)
    primera = crear_liga(session, nombre="Liga Profesional", orden=1, cobertura=Cobertura.completa)

    respuesta = cliente_con_sesion.get("/api/v1/ligas")

    assert respuesta.status_code == 200
    assert respuesta.json() == [
        {
            "id": primera.id,
            "nombre": "Liga Profesional",
            "cobertura": "completa",
            "temporada_actual": 2026,
        },
        {
            "id": segunda.id,
            "nombre": "Primera Nacional",
            "cobertura": "completa",
            "temporada_actual": 2026,
        },
    ]


# --- BUS-003: métricas tácticas ---


def test_bus003_un_minimo_de_pases(cliente_con_sesion: TestClient, session: Session):
    liga = crear_liga(session)
    _jugador_con(session, "Pases 80", liga=liga, pases_precision_pct=80)
    _jugador_con(session, "Pases 79.9", liga=liga, pases_precision_pct=79.9)

    assert _nombres(cliente_con_sesion.get(URL, params={"pases_min": 80})) == ["Pases 80"]


def test_bus003_varios_minimos_se_combinan_con_and(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    comun = {"liga": liga, "duelos_totales": 100, "partidos_jugados": 20}
    _jugador_con(
        session,
        "Cumple los 3",
        pases_precision_pct=85,
        duelos_ganados=60,
        minutos_jugados=1500,
        **comun,
    )
    _jugador_con(
        session,
        "Pocos minutos",
        pases_precision_pct=85,
        duelos_ganados=60,
        minutos_jugados=900,
        **comun,
    )
    _jugador_con(
        session,
        "Pocos duelos",
        pases_precision_pct=85,
        duelos_ganados=50,
        minutos_jugados=1500,
        **comun,
    )

    respuesta = cliente_con_sesion.get(
        URL, params={"pases_min": 80, "duelos_min": 55, "minutos_min": 1000}
    )

    assert _nombres(respuesta) == ["Cumple los 3"]


def test_bus003_metrica_no_disponible_excluye_y_se_cuenta(
    cliente_con_sesion: TestClient, session: Session
):
    completa = crear_liga(session)
    primera_c = crear_liga(session, cobertura=Cobertura.basica)
    _jugador_con(session, "Con pases", liga=completa, pases_precision_pct=85)
    _jugador_con(session, "Sin pases 1", liga=primera_c, pases_precision_pct=None)
    _jugador_con(session, "Sin pases 2", liga=primera_c, pases_precision_pct=None)
    _jugador_con(session, "Sin pases y arquero", liga=primera_c, posicion=Posicion.arquero)

    respuesta = cliente_con_sesion.get(URL, params={"pases_min": 80, "posicion": "defensor"})

    assert _nombres(respuesta) == ["Con pases"]
    # El arquero no cumple la posición: no cuenta como excluido por dato faltante
    assert respuesta.json()["excluidos_por_dato_faltante"] == 2


def test_bus003_un_jugador_que_falla_otro_minimo_no_cuenta_como_excluido(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con(session, "Sin pases y pocos minutos", liga=liga, minutos_jugados=100)

    respuesta = cliente_con_sesion.get(URL, params={"pases_min": 80, "minutos_min": 1000})

    assert respuesta.json()["excluidos_por_dato_faltante"] == 0


def test_bus003_metricas_derivadas_de_rn018(cliente_con_sesion: TestClient, session: Session):
    _jugador_con(
        session,
        "Ejemplo RN-018",
        liga=crear_liga(session),
        duelos_totales=100,
        duelos_ganados=61,
        intercepciones=52,
        partidos_jugados=28,
        rating=7.123,
    )

    jugador = cliente_con_sesion.get(URL).json()["resultados"][0]

    assert jugador["duelos_ganados_pct"] == 61
    assert jugador["recuperaciones_por_partido"] == 1.9
    assert jugador["rating"] == 7.12


def test_bus003_los_minimos_derivados_filtran_sobre_el_valor_calculado(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con(session, "1.9 por partido", liga=liga, intercepciones=52, partidos_jugados=28)
    _jugador_con(session, "1 por partido", liga=liga, intercepciones=20, partidos_jugados=20)
    _jugador_con(session, "Sin partidos", liga=liga, intercepciones=5, partidos_jugados=0)

    respuesta = cliente_con_sesion.get(URL, params={"recuperaciones_min": 1.5})

    assert _nombres(respuesta) == ["1.9 por partido"]
    # 0 partidos: la métrica es None (RN-018), así que cuenta como dato faltante
    assert respuesta.json()["excluidos_por_dato_faltante"] == 1


def test_bus003_un_dato_faltante_se_devuelve_null_y_nunca_0(
    cliente_con_sesion: TestClient, session: Session
):
    _jugador_con(session, "Sin métricas", liga=crear_liga(session))

    jugador = cliente_con_sesion.get(URL).json()["resultados"][0]

    for metrica in (
        "minutos_jugados",
        "pases_precision_pct",
        "duelos_ganados_pct",
        "recuperaciones_por_partido",
        "rating",
        "valor_mercado_eur",
    ):
        assert jugador[metrica] is None


# --- Forma de la respuesta (CONTRATO_DE_API.md) ---


def test_bus001_la_respuesta_tiene_la_forma_del_contrato(
    cliente_con_sesion: TestClient, session: Session, usuario_con_sesion
):
    liga = crear_liga(session, nombre="Primera Nacional")
    equipo = crear_equipo(session, nombre="Deportivo Norte")
    jugador = crear_jugador(
        session,
        nombre="Nahuel Ferreyra",
        fecha_nacimiento=date(2003, 4, 12),
        valor_mercado_eur=85000,
    )
    crear_estadistica(
        session,
        jugador=jugador,
        liga=liga,
        equipo=equipo,
        minutos_jugados=2410,
        pases_precision_pct=87,
    )
    session.add(Seguimiento(usuario_id=usuario_con_sesion.id, jugador_id=jugador.id))
    session.flush()

    cuerpo = cliente_con_sesion.get(URL).json()

    assert cuerpo == {
        "resultados": [
            {
                "id": jugador.id,
                "nombre": "Nahuel Ferreyra",
                "posicion": "defensor",
                "edad": 23,
                "equipo": "Deportivo Norte",
                "liga": {"id": liga.id, "nombre": "Primera Nacional", "cobertura": "completa"},
                "temporada": 2026,
                "minutos_jugados": 2410,
                "pases_precision_pct": 87.0,
                "duelos_ganados_pct": None,
                "recuperaciones_por_partido": None,
                "rating": None,
                "valor_mercado_eur": 85000,
                "en_seguimiento": True,
            }
        ],
        "total": 1,
        "pagina": 1,
        "tamano": 6,
        "excluidos_por_dato_faltante": 0,
        "excluidos_sin_valor": 0,
        "liga_sin_datos": False,
        "sugerencia": None,
    }


def test_bus001_por_defecto_se_ordena_por_minutos_con_los_nulos_al_final(
    cliente_con_sesion: TestClient, session: Session
):
    liga = crear_liga(session)
    _jugador_con(session, "Sin minutos", liga=liga, minutos_jugados=None)
    _jugador_con(session, "Pocos", liga=liga, minutos_jugados=100)
    _jugador_con(session, "Muchos", liga=liga, minutos_jugados=2000)

    assert _nombres(cliente_con_sesion.get(URL)) == ["Muchos", "Pocos", "Sin minutos"]
