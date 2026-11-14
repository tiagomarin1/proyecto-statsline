"""JUG-003: cómo se arma la trayectoria que se muestra en la ficha (RN-032), como función pura."""

from app.servicios.trayectoria import ClubActual, armar_trayectoria
from app.sincronizacion.mapeo_trayectoria import PasoTrayectoria


def _pasos(club_id: int, nombre: str, *temporadas: int | None) -> list[PasoTrayectoria]:
    return [PasoTrayectoria(club_id, nombre, t) for t in temporadas]


def _resumen(trayectoria) -> list[tuple[str, bool, list[tuple[int, int]]]]:
    return [(c.club, c.actual, [(t.desde, t.hasta) for t in c.tramos]) for c in trayectoria]


# Datos reales de un jugador de Primera B Metropolitana (ejemplo de RN-032)
EJEMPLO_RN_032 = [
    *_pasos(447, "Chacarita Juniors", 2008, 2010, 2011, 2012, 2016, 2017),
    *_pasos(481, "Villa Dalmine", 2013, 2014, 2015),
    *_pasos(1962, "Alvarado", 2020, 2021, 2022),
    *_pasos(485, "San Martin Tucuman", 2018, 2019),
    *_pasos(1948, "Atlanta", 2023),
    *_pasos(8383, "Deportivo Merlo", 2024, 2025),
]


def test_jug003_el_ejemplo_de_rn_032():
    trayectoria = armar_trayectoria(
        EJEMPLO_RN_032, ClubActual(id_club=8383, nombre="Deportivo Merlo")
    )

    assert _resumen(trayectoria) == [
        ("Deportivo Merlo", True, [(2024, 2025)]),
        ("Atlanta", False, [(2023, 2023)]),
        ("Alvarado", False, [(2020, 2022)]),
        ("San Martin Tucuman", False, [(2018, 2019)]),
        ("Chacarita Juniors", False, [(2016, 2017), (2010, 2012), (2008, 2008)]),
        ("Villa Dalmine", False, [(2013, 2015)]),
    ]


def test_jug003_los_años_consecutivos_se_agrupan_en_un_tramo():
    trayectoria = armar_trayectoria(_pasos(1, "Alvarado", 2020, 2021, 2022), None)

    assert _resumen(trayectoria) == [("Alvarado", False, [(2020, 2022)])]


def test_jug003_un_hueco_parte_el_club_en_dos_tramos_del_mas_reciente_al_mas_viejo():
    trayectoria = armar_trayectoria(_pasos(1, "Chacarita", 2008, 2009, 2016), None)

    assert _resumen(trayectoria) == [("Chacarita", False, [(2016, 2016), (2008, 2009)])]


def test_jug003_un_solo_año_es_un_tramo_con_desde_igual_a_hasta():
    trayectoria = armar_trayectoria(_pasos(1, "Atlanta", 2023), None)

    assert (trayectoria[0].tramos[0].desde, trayectoria[0].tramos[0].hasta) == (2023, 2023)


def test_jug003_los_años_desordenados_o_repetidos_se_ordenan_y_se_deduplican():
    trayectoria = armar_trayectoria(_pasos(1, "Alvarado", 2022, 2020, 2021, 2021), None)

    assert _resumen(trayectoria) == [("Alvarado", False, [(2020, 2022)])]


def test_jug003_los_clubes_se_ordenan_por_su_ultimo_año():
    pasos = [
        *_pasos(1, "Viejo", 2010),
        *_pasos(2, "Reciente", 2025),
        *_pasos(3, "Medio", 2018, 2019),
    ]

    trayectoria = armar_trayectoria(pasos, None)

    assert [c.club for c in trayectoria] == ["Reciente", "Medio", "Viejo"]


def test_jug003_con_el_mismo_ultimo_año_se_ordena_por_nombre():
    pasos = [*_pasos(1, "Zeta", 2020), *_pasos(2, "Alfa", 2020)]

    assert [c.club for c in armar_trayectoria(pasos, None)] == ["Alfa", "Zeta"]


def test_jug003_un_club_sin_años_va_al_final_con_tramos_vacios():
    pasos = [*_pasos(1, "Sin año", None), *_pasos(2, "Con años", 2015)]

    trayectoria = armar_trayectoria(pasos, None)

    assert _resumen(trayectoria) == [("Con años", False, [(2015, 2015)]), ("Sin año", False, [])]


def test_jug003_el_club_actual_va_primero_aunque_no_sea_el_mas_reciente():
    pasos = [*_pasos(1, "Otro", 2025), *_pasos(2, "Actual FC", 2020)]

    trayectoria = armar_trayectoria(pasos, ClubActual(id_club=2, nombre="Actual FC"))

    assert [(c.club, c.actual) for c in trayectoria] == [("Actual FC", True), ("Otro", False)]


def test_jug003_un_club_actual_que_no_figura_se_muestra_igual_primero_y_sin_tramos():
    trayectoria = armar_trayectoria(
        _pasos(1, "Anterior", 2022), ClubActual(id_club=99, nombre="Club Nuevo")
    )

    assert _resumen(trayectoria) == [
        ("Club Nuevo", True, []),
        ("Anterior", False, [(2022, 2022)]),
    ]


def test_jug003_si_el_equipo_no_tiene_id_de_api_football_se_reconoce_por_el_nombre():
    pasos = _pasos(7, "Club Atlético Norte", 2024, 2025)

    trayectoria = armar_trayectoria(pasos, ClubActual(id_club=None, nombre="club atletico norte"))

    assert [(c.club, c.actual) for c in trayectoria] == [("Club Atlético Norte", True)]


def test_jug003_sin_pasos_queda_solo_el_club_actual():
    trayectoria = armar_trayectoria([], ClubActual(id_club=5, nombre="Brown de Adrogué"))

    assert _resumen(trayectoria) == [("Brown de Adrogué", True, [])]


def test_jug003_sin_pasos_ni_club_actual_la_lista_esta_vacia():
    assert armar_trayectoria([], None) == []


def test_jug003_un_club_con_filas_con_y_sin_año_junta_todo_en_una_sola_entrada():
    pasos = [*_pasos(1, "Racing", None, 2021, 2022)]

    trayectoria = armar_trayectoria(pasos, None)

    assert _resumen(trayectoria) == [("Racing", False, [(2021, 2022)])]
