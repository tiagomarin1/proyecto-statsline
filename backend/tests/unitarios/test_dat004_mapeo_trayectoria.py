"""DAT-004: mapeo de /players/teams a la trayectoria, sin selecciones (RN-033)."""

import pytest

from app.sincronizacion.mapeo_trayectoria import PasoTrayectoria, es_seleccion, mapear_trayectoria
from tests.api_football_falsa import cargar_fixture


def _clubes(pasos: list[PasoTrayectoria]) -> dict[str, list[int | None]]:
    resultado: dict[str, list[int | None]] = {}
    for paso in pasos:
        resultado.setdefault(paso.nombre_club, []).append(paso.temporada)
    return {
        club: sorted(temporadas, key=lambda t: t or 0) for club, temporadas in resultado.items()
    }


def test_dat004_se_guarda_una_fila_por_club_y_temporada():
    respuesta = cargar_fixture("players_teams_varios_clubes")["response"]

    pasos = mapear_trayectoria(respuesta)

    assert len(pasos) == 17
    assert _clubes(pasos) == {
        "Deportivo Merlo": [2024, 2025],
        "Atlanta": [2023],
        "Alvarado": [2020, 2021, 2022],
        "San Martin Tucuman": [2018, 2019],
        "Chacarita Juniors": [2008, 2010, 2011, 2012, 2016, 2017],
        "Villa Dalmine": [2013, 2014, 2015],
    }


def test_dat004_cada_paso_trae_el_id_del_club_de_api_football():
    respuesta = cargar_fixture("players_teams_varios_clubes")["response"]

    ids = {paso.nombre_club: paso.id_club_api_football for paso in mapear_trayectoria(respuesta)}

    assert ids["Deportivo Merlo"] == 8383
    assert ids["Chacarita Juniors"] == 447


def test_dat004_las_selecciones_no_se_guardan():
    respuesta = cargar_fixture("players_teams_con_seleccion")["response"]

    pasos = mapear_trayectoria(respuesta)

    assert _clubes(pasos) == {"River Plate": [2023, 2024, 2025, 2026]}


def test_dat004_un_club_sin_temporadas_queda_con_temporada_none():
    respuesta = cargar_fixture("players_teams_club_sin_temporadas")["response"]

    pasos = mapear_trayectoria(respuesta)

    assert _clubes(pasos)["Vargas Torres"] == [None]
    assert len(pasos) == 5  # 2 + 1 (sin temporada) + 1 + 1


def test_dat004_un_jugador_con_un_solo_club_devuelve_solo_ese_club():
    respuesta = cargar_fixture("players_teams_un_solo_club")["response"]

    assert _clubes(mapear_trayectoria(respuesta)) == {"Brown DE Adrogue": [2023, 2024, 2025]}


def test_dat004_las_temporadas_que_llegan_como_texto_se_convierten_a_entero():
    respuesta = [{"team": {"id": 1, "name": "Club A"}, "seasons": ["2021", 2022, "2023"]}]

    assert [p.temporada for p in mapear_trayectoria(respuesta)] == [2021, 2022, 2023]


def test_dat004_se_descarta_lo_que_no_es_una_temporada():
    respuesta = [{"team": {"id": 1, "name": "Club A"}, "seasons": [2021, "abc", None, -1, True]}]

    assert [p.temporada for p in mapear_trayectoria(respuesta)] == [2021]


def test_dat004_una_temporada_repetida_se_guarda_una_sola_vez():
    respuesta = [{"team": {"id": 1, "name": "Club A"}, "seasons": [2021, 2021, "2021"]}]

    assert len(mapear_trayectoria(respuesta)) == 1


def test_dat004_si_todas_las_temporadas_son_invalidas_queda_el_club_sin_temporada():
    respuesta = [{"team": {"id": 1, "name": "Club A"}, "seasons": ["abc"]}]

    assert [p.temporada for p in mapear_trayectoria(respuesta)] == [None]


@pytest.mark.parametrize(
    "entrada",
    [
        {"team": {"id": None, "name": "Sin id"}, "seasons": [2020]},
        {"team": {"id": 7, "name": "  "}, "seasons": [2020]},
        {"team": None, "seasons": [2020]},
        {"seasons": [2020]},
    ],
)
def test_dat004_una_entrada_sin_id_o_sin_nombre_de_club_se_ignora(entrada):
    assert mapear_trayectoria([entrada]) == []


def test_dat004_el_nombre_del_club_se_recorta_al_largo_de_la_columna():
    respuesta = [{"team": {"id": 1, "name": "X" * 300}, "seasons": [2020]}]

    assert len(mapear_trayectoria(respuesta)[0].nombre_club) == 120


@pytest.mark.parametrize(
    "nombre",
    [
        "Argentina",
        "Argentina U20",
        "Argentina U-23",
        "Argentina W",
        "argentina",
        "Uruguay",
        "Paraguay U17",
        "Peru",
        "Perú",
        "Brazil",
        "Colombia",
        "Chile",
        "Bolivia",
        "Venezuela",
        "Ecuador",
        "Mexico",
        "Spain",
        "Italy",
    ],
)
def test_dat004_rn_033_un_nombre_de_pais_es_una_seleccion(nombre):
    assert es_seleccion(nombre)


@pytest.mark.parametrize(
    "nombre",
    [
        "Argentino de Quilmes",
        "Atlético Argentino",
        "Argentinos Juniors",
        "Boca Juniors",
        "River Plate",
        "Racing Cordoba",
        "Brown DE Adrogue",
        "Club Atlético Peru",
        "Brasil de Pelotas",
        "Chacarita U20",
        "Independiente II",
        "",
    ],
)
def test_dat004_rn_033_un_club_no_es_una_seleccion(nombre):
    assert not es_seleccion(nombre)
