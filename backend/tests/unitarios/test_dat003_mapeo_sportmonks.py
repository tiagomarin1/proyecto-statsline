"""DAT-003: mapeo de las estadísticas de Sportmonks al modelo canónico (RN-008, RN-019, RN-031)."""

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from app.modelos.enums import Posicion
from app.sincronizacion.mapeo_sportmonks import (
    contar_jugadores_con_minutos,
    mapear_estadisticas,
)

FIXTURE = (
    Path(__file__).parents[1]
    / "fixtures"
    / "sportmonks"
    / "estadisticas_por_participante_muestra.json"
)


@pytest.fixture(scope="module")
def filas() -> list[dict]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))["data"]


@pytest.fixture(scope="module")
def datos(filas):
    return mapear_estadisticas(filas)


def _estadistica(datos, id_jugador: int, id_equipo: int):
    return next(
        e
        for e in datos.estadisticas
        if (e.id_jugador_sportmonks, e.id_equipo_sportmonks) == (id_jugador, id_equipo)
    )


def test_dat003_se_mapean_todas_las_metricas_de_un_jugador_completo(datos):
    e = _estadistica(datos, 700001, 810)

    assert e.posicion == Posicion.defensor
    assert e.minutos_jugados == 2700
    assert e.partidos_jugados == 30
    assert e.goles == 2
    assert e.asistencias == 3
    assert e.duelos_totales == 100
    assert e.duelos_ganados == 61
    assert e.intercepciones == 45


def test_dat003_el_porcentaje_de_pases_se_calcula_con_pases_acertados_y_totales(datos):
    # 640 pases acertados de 800 → 80,00 % (RN-031)
    assert _estadistica(datos, 700001, 810).pases_precision_pct == Decimal("80.00")


def test_dat003_el_rating_es_el_promedio_con_dos_decimales(datos):
    assert _estadistica(datos, 700001, 810).rating == Decimal("6.91")


def test_dat003_una_metrica_que_no_viene_queda_none_y_no_0(datos):
    e = _estadistica(datos, 700002, 810)

    assert e.asistencias is None
    assert e.rating is None
    assert e.duelos_totales is None
    assert e.duelos_ganados is None
    assert e.intercepciones is None


def test_dat003_con_cero_pases_totales_el_porcentaje_queda_none(datos):
    assert _estadistica(datos, 700002, 810).pases_precision_pct is None


def test_dat003_un_cero_real_se_conserva_como_cero(datos):
    # El jugador 700002 tiene 0 goles de verdad: no es dato faltante
    assert _estadistica(datos, 700002, 810).goles == 0


def test_dat003_pases_acertados_mayores_a_los_totales_quedan_none(datos):
    assert _estadistica(datos, 700003, 811).pases_precision_pct is None


def test_dat003_duelos_ganados_mayores_a_los_totales_dejan_los_dos_en_none(datos):
    e = _estadistica(datos, 700003, 811)

    assert e.duelos_totales is None
    assert e.duelos_ganados is None


@pytest.mark.parametrize(
    ("position_id", "esperada"),
    [
        (24, Posicion.arquero),
        (25, Posicion.defensor),
        (26, Posicion.mediocampista),
        (27, Posicion.delantero),
        (99, None),
        (None, None),
    ],
)
def test_dat003_la_posicion_se_traduce_a_las_cuatro_de_rn_019(position_id, esperada):
    fila = {
        "player_id": 1,
        "team_id": 2,
        "position_id": position_id,
        "details": [],
        "player": {"id": 1, "name": "Jugador Uno", "date_of_birth": "2000-01-01"},
        "team": {"id": 2, "name": "Club"},
    }

    assert mapear_estadisticas([fila]).estadisticas[0].posicion == esperada


def test_dat003_se_mapean_los_datos_del_jugador(datos):
    jugador = next(j for j in datos.jugadores if j.id_sportmonks == 700001)

    assert jugador.nombre == "Matías Ezequiel Ferreyra"
    assert jugador.nombre_pila == "Matías Ezequiel"
    assert jugador.apellido == "Ferreyra"
    assert jugador.fecha_nacimiento == date(1999, 5, 10)


def test_dat003_un_jugador_sin_fecha_de_nacimiento_queda_con_none(datos):
    jugador = next(j for j in datos.jugadores if j.id_sportmonks == 700004)

    assert jugador.fecha_nacimiento is None


def test_dat003_cada_jugador_y_cada_equipo_aparece_una_sola_vez(datos):
    assert sorted(j.id_sportmonks for j in datos.jugadores) == [700001, 700002, 700003, 700004]
    assert {e.id_sportmonks: e.nombre for e in datos.equipos} == {
        810: "Club Atlético Norte",
        811: "Deportivo Sur",
    }


def test_dat003_un_jugador_en_dos_equipos_conserva_las_dos_filas(datos):
    # RN-017: se guardan todas; la elección de una se hace al leer
    filas_del_jugador = [e for e in datos.estadisticas if e.id_jugador_sportmonks == 700001]

    assert {e.id_equipo_sportmonks: e.minutos_jugados for e in filas_del_jugador} == {
        810: 2700,
        811: 300,
    }


def test_dat003_si_el_mismo_jugador_y_equipo_se_repite_queda_la_fila_con_mas_minutos(filas):
    repetida = json.loads(json.dumps(filas[0]))
    repetida["details"] = [
        {"id": 99, "player_statistic_id": 1, "type_id": 119, "value": {"total": 100}}
    ]

    datos = mapear_estadisticas([repetida, filas[0]])

    estadisticas = [e for e in datos.estadisticas if e.id_jugador_sportmonks == 700001]
    assert len(estadisticas) == 1
    assert estadisticas[0].minutos_jugados == 2700


def test_dat003_una_fila_sin_jugador_o_sin_equipo_se_ignora(filas):
    sin_jugador = {**filas[0], "player": None}
    sin_equipo = {**filas[1], "team": None}

    datos = mapear_estadisticas([sin_jugador, sin_equipo])

    assert datos.estadisticas == []
    assert datos.jugadores == []


def test_dat003_se_cuentan_los_jugadores_distintos_con_minutos(datos):
    # 700001, 700002 y 700003 tienen minutos; 700004 no tiene ninguna métrica
    assert contar_jugadores_con_minutos(datos) == 3
