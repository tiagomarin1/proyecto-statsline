"""DAT-001: mapeo de /players al modelo canónico (RN-019 y casos borde), con fixtures reales."""

import copy
from datetime import date
from decimal import Decimal

import pytest

from app.modelos.enums import Posicion
from app.sincronizacion.mapeo import (
    convertir_fecha,
    convertir_rating,
    mapear_jugadores,
    mapear_posicion,
)
from tests.api_football_falsa import cargar_fixture

LIGA_PROFESIONAL = 128
PRIMERA_NACIONAL = 129


def _liga_completa() -> list[dict]:
    return cargar_fixture("players_liga_completa_128_2026_p1")["response"]


def _liga_basica() -> list[dict]:
    return cargar_fixture("players_liga_basica_129_2025_p1")["response"]


def _estadistica_de(datos, id_jugador: int, id_equipo: int):
    return next(
        e
        for e in datos.estadisticas
        if (e.id_jugador_api, e.id_equipo_api) == (id_jugador, id_equipo)
    )


def test_dat001_mapea_jugador_equipo_y_estadistica_de_una_liga_completa():
    datos = mapear_jugadores(_liga_completa(), LIGA_PROFESIONAL)

    arias = next(j for j in datos.jugadores if j.id_api_football == 30)
    assert arias.nombre == "S. Arias"
    assert arias.nombre_pila == "Santiago"
    assert arias.apellido == "Arias Naranjo"
    assert arias.fecha_nacimiento == date(1992, 1, 13)
    assert arias.nacionalidad == "Colombia"
    assert any(e.id_api_football == 453 and e.nombre == "Independiente" for e in datos.equipos)

    estadistica = _estadistica_de(datos, 30, 453)
    assert estadistica.posicion == Posicion.defensor
    assert estadistica.partidos_jugados == 23
    assert estadistica.minutos_jugados == 1572
    assert estadistica.goles == 0
    assert estadistica.asistencias == 2
    assert estadistica.pases_precision_pct == Decimal("74")
    assert estadistica.duelos_totales == 149
    assert estadistica.duelos_ganados == 91
    assert estadistica.intercepciones == 28
    assert estadistica.rating == Decimal("6.69")


def test_dat001_se_guardan_las_dos_filas_de_un_jugador_que_cambio_de_equipo():
    # "M. Rojo" jugó en Racing y en Estudiantes: RN-017 elige al leer, acá se guardan las dos
    datos = mapear_jugadores(_liga_completa(), LIGA_PROFESIONAL)

    assert len(datos.jugadores) == 20
    assert len(datos.estadisticas) == 21
    assert _estadistica_de(datos, 890, 436).minutos_jugados == 1382
    assert _estadistica_de(datos, 890, 450).minutos_jugados == 90


def test_dat001_un_null_de_la_api_queda_none_y_nunca_0():
    # E. Cavani: tackles.interceptions viene null
    datos = mapear_jugadores(_liga_completa(), LIGA_PROFESIONAL)

    assert _estadistica_de(datos, 274, 451).intercepciones is None


def test_dat001_las_entradas_de_otras_ligas_se_ignoran():
    respuesta = _liga_completa()
    copa = copy.deepcopy(respuesta[0]["statistics"][0])
    copa["league"]["id"] = 1032
    copa["team"]["id"] = 9999
    respuesta[0]["statistics"].append(copa)

    datos = mapear_jugadores(respuesta, LIGA_PROFESIONAL)

    assert all(e.id_equipo_api != 9999 for e in datos.estadisticas)
    assert all(e.id_api_football != 9999 for e in datos.equipos)


def test_dat001_un_jugador_sin_entradas_de_la_liga_no_se_guarda():
    respuesta = _liga_completa()[:1]
    respuesta[0]["statistics"][0]["league"]["id"] = 1032

    datos = mapear_jugadores(respuesta, LIGA_PROFESIONAL)

    assert datos.jugadores == []
    assert datos.estadisticas == []


def test_dat001_metricas_que_la_liga_no_publica_quedan_en_none():
    datos = mapear_jugadores(_liga_basica(), PRIMERA_NACIONAL)

    assert datos.estadisticas
    for estadistica in datos.estadisticas:
        assert estadistica.pases_precision_pct is None
        assert estadistica.duelos_totales is None
        assert estadistica.duelos_ganados is None
        assert estadistica.intercepciones is None
        assert estadistica.rating is None


def test_dat001_en_una_liga_basica_minutos_null_queda_none_y_minutos_0_queda_0():
    datos = mapear_jugadores(_liga_basica(), PRIMERA_NACIONAL)

    assert _estadistica_de(datos, 1881, 1067).minutos_jugados is None
    assert _estadistica_de(datos, 2557, 485).minutos_jugados == 0
    assert _estadistica_de(datos, 5162, 448).minutos_jugados == 1032


def test_dat001_dos_entradas_del_mismo_equipo_en_la_liga_quedan_en_una_fila():
    # La clave única es jugador + liga + equipo + temporada: se queda la de más minutos
    respuesta = _liga_completa()[:1]
    repetida = copy.deepcopy(respuesta[0]["statistics"][0])
    repetida["games"]["minutes"] = 200
    respuesta[0]["statistics"].append(repetida)

    datos = mapear_jugadores(respuesta, LIGA_PROFESIONAL)

    assert len(datos.estadisticas) == 1
    assert datos.estadisticas[0].minutos_jugados == 1572


def test_dat001_un_dato_que_viola_las_invariantes_del_modelo_queda_none():
    respuesta = _liga_completa()[:1]
    estadistica = respuesta[0]["statistics"][0]
    estadistica["passes"]["accuracy"] = 140
    estadistica["duels"] = {"total": 10, "won": 12}
    estadistica["goals"]["total"] = -1

    datos = mapear_jugadores(respuesta, LIGA_PROFESIONAL)

    mapeada = datos.estadisticas[0]
    assert mapeada.pases_precision_pct is None
    assert mapeada.duelos_totales is None
    assert mapeada.duelos_ganados is None
    assert mapeada.goles is None


def test_dat001_jugador_sin_fecha_de_nacimiento_queda_con_none():
    respuesta = _liga_completa()[:1]
    respuesta[0]["player"]["birth"]["date"] = None

    datos = mapear_jugadores(respuesta, LIGA_PROFESIONAL)

    assert datos.jugadores[0].fecha_nacimiento is None


@pytest.mark.parametrize(
    ("posicion_api", "esperada"),
    [
        ("Goalkeeper", Posicion.arquero),
        ("Defender", Posicion.defensor),
        ("Midfielder", Posicion.mediocampista),
        ("Attacker", Posicion.delantero),
        ("Forward", Posicion.delantero),
        ("Unknown", None),
        ("", None),
        (None, None),
    ],
)
def test_dat001_rn019_mapeo_de_posiciones(posicion_api, esperada):
    assert mapear_posicion(posicion_api) == esperada


@pytest.mark.parametrize(
    ("rating_api", "esperado"),
    [
        ("7.123456", Decimal("7.12")),
        ("6.9", Decimal("6.90")),
        ("7", Decimal("7.00")),
        (None, None),
        ("", None),
        ("s/d", None),
    ],
)
def test_dat001_el_rating_string_se_convierte_a_decimal(rating_api, esperado):
    assert convertir_rating(rating_api) == esperado


@pytest.mark.parametrize(
    ("fecha_api", "esperada"),
    [("1992-01-13", date(1992, 1, 13)), (None, None), ("", None), ("13/01/1992", None)],
)
def test_dat001_la_fecha_de_nacimiento_se_convierte(fecha_api, esperada):
    assert convertir_fecha(fecha_api) == esperada
