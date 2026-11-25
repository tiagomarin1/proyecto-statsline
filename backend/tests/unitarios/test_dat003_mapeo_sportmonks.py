"""DAT-003: mapeo de jugadores y estadísticas de Sportmonks al modelo canónico (RN-008, RN-031).

La forma de los datos es la real de `/players/{id}?include=statistics.details` (16/11/2026).
"""

from datetime import date
from decimal import Decimal

from app.modelos.enums import Posicion
from app.sincronizacion.mapeo_sportmonks import contar_jugadores_con_minutos, mapear_liga
from tests.sportmonks_falsa import equipo, estadisticas, fila, jugador

TEMPORADA = 26809
EQUIPOS = [equipo(810, "Club Atlético Norte"), equipo(820, "Deportivo Sur")]


def _completo() -> dict:
    detalles = estadisticas(
        t119=2700, t321=30, t52=2, t79=3, t80=800, t116=640, t105=100, t106=61, t100=45, t118=6.834
    )
    return jugador(1, "Lucas Martínez", posicion=25, filas=[fila(810, TEMPORADA, detalles, 25)])


def _mapear(*jugadores: dict, paises: dict[int, str] | None = None):
    return mapear_liga(EQUIPOS, list(jugadores), TEMPORADA, paises)


def _estadistica(datos, id_jugador: int = 1, id_equipo: int = 810):
    return next(
        e
        for e in datos.estadisticas
        if (e.id_jugador_sportmonks, e.id_equipo_sportmonks) == (id_jugador, id_equipo)
    )


def _con_detalles(id_jugador: int, detalles: list[dict], posicion: int | None = 26) -> dict:
    return jugador(
        id_jugador, f"Jugador {id_jugador}", filas=[fila(810, TEMPORADA, detalles, posicion)]
    )


def test_dat003_se_mapean_todas_las_metricas_de_un_jugador_completo():
    e = _estadistica(_mapear(_completo()))

    assert e.posicion == Posicion.defensor
    assert e.minutos_jugados == 2700
    assert e.partidos_jugados == 30
    assert e.goles == 2
    assert e.asistencias == 3
    assert e.duelos_totales == 100
    assert e.duelos_ganados == 61
    assert e.intercepciones == 45


def test_dat003_el_porcentaje_de_pases_se_calcula_con_pases_acertados_y_totales():
    # 640 pases acertados de 800 → 80,00 % (RN-031)
    assert _estadistica(_mapear(_completo())).pases_precision_pct == Decimal("80.00")


def test_dat003_si_sportmonks_trae_el_porcentaje_de_pases_se_usa_ese():
    datos = _mapear(_con_detalles(2, estadisticas(t119=900, t80=7, t116=5, t1584=71.43)))

    assert _estadistica(datos, 2).pases_precision_pct == Decimal("71.43")


def test_dat003_un_porcentaje_de_pases_fuera_de_rango_se_ignora_y_se_calcula():
    datos = _mapear(_con_detalles(2, estadisticas(t119=900, t80=400, t116=320, t1584=140)))

    assert _estadistica(datos, 2).pases_precision_pct == Decimal("80.00")


def test_dat003_sin_pases_totales_el_porcentaje_queda_en_null():
    datos = _mapear(_con_detalles(2, estadisticas(t119=900, t80=0, t116=0)))

    assert _estadistica(datos, 2).pases_precision_pct is None


def test_dat003_el_rating_es_el_promedio_con_dos_decimales():
    assert _estadistica(_mapear(_completo())).rating == Decimal("6.83")


def test_dat003_lo_que_no_viene_queda_en_null_y_nunca_en_cero():
    e = _estadistica(_mapear(_con_detalles(3, estadisticas(t119=450, t321=6))), 3)

    assert e.minutos_jugados == 450
    assert e.goles is None
    assert e.asistencias is None
    assert e.pases_precision_pct is None
    assert e.duelos_totales is None
    assert e.intercepciones is None
    assert e.rating is None


def test_dat003_una_fila_sin_detalles_se_guarda_con_todo_en_null():
    e = _estadistica(_mapear(_con_detalles(4, [])), 4)

    assert e.minutos_jugados is None
    assert e.rating is None


def test_dat003_duelos_ganados_mayores_a_los_totales_quedan_en_null_los_dos():
    e = _estadistica(_mapear(_con_detalles(2, estadisticas(t119=900, t105=10, t106=12))), 2)

    assert (e.duelos_totales, e.duelos_ganados) == (None, None)


def test_dat003_las_posiciones_se_traducen_a_los_cuatro_codigos():
    esperadas = {
        24: Posicion.arquero,
        25: Posicion.defensor,
        26: Posicion.mediocampista,
        27: Posicion.delantero,
    }
    datos = _mapear(*[_con_detalles(100 + id_, estadisticas(t119=90), id_) for id_ in esperadas])

    obtenidas = {id_: _estadistica(datos, 100 + id_).posicion for id_ in esperadas}
    assert obtenidas == esperadas


def test_dat003_una_posicion_desconocida_queda_en_null():
    assert _estadistica(_mapear(_con_detalles(5, estadisticas(t119=90), 221)), 5).posicion is None


def test_dat003_si_la_fila_no_trae_posicion_se_usa_la_del_jugador():
    ficha = jugador(
        5, "Hugo Ríos", posicion=27, filas=[fila(810, TEMPORADA, estadisticas(t119=9), None)]
    )

    assert _estadistica(_mapear(ficha), 5).posicion == Posicion.delantero


def test_dat003_se_mapea_el_jugador_con_sus_datos_personales():
    [j] = _mapear(_completo()).jugadores

    assert (j.id_sportmonks, j.nombre, j.nombre_pila, j.apellido) == (
        1,
        "Lucas Martínez",
        "Lucas",
        "Martínez",
    )
    assert j.fecha_nacimiento == date(1999, 3, 15)


def test_dat003_sin_fecha_de_nacimiento_o_con_una_invalida_queda_en_null():
    filas = [fila(810, TEMPORADA, estadisticas(t119=90))]
    datos = _mapear(
        jugador(6, "Ana Gil", nacimiento=None, filas=filas),
        jugador(7, "Eva Roca", nacimiento="no-es-fecha", filas=filas),
    )

    assert [j.fecha_nacimiento for j in datos.jugadores] == [None, None]


def test_dat003_solo_cuentan_las_filas_de_la_temporada_pedida():
    otra = fila(810, 25000, estadisticas(t119=3000))
    propia = fila(810, TEMPORADA, estadisticas(t119=500))
    datos = _mapear(jugador(8, "Iván Cruz", filas=[otra, propia]))

    assert _estadistica(datos, 8).minutos_jugados == 500


def test_dat003_un_jugador_sin_filas_de_la_temporada_no_se_guarda():
    datos = _mapear(jugador(9, "Sin Datos", filas=[fila(810, 25000, estadisticas(t119=90))]))

    assert datos.jugadores == []
    assert datos.estadisticas == []


def test_dat003_un_jugador_en_dos_equipos_guarda_una_fila_por_equipo():
    filas = [
        fila(810, TEMPORADA, estadisticas(t119=400)),
        fila(820, TEMPORADA, estadisticas(t119=900)),
    ]
    datos = _mapear(jugador(10, "Gonzalo Vera", filas=filas))

    assert len(datos.jugadores) == 1
    assert {e.id_equipo_sportmonks for e in datos.estadisticas} == {810, 820}
    assert {e.nombre for e in datos.equipos} == {"Club Atlético Norte", "Deportivo Sur"}


def test_dat003_una_fila_de_un_equipo_que_no_esta_en_la_lista_se_ignora():
    datos = _mapear(jugador(11, "Luis Paz", filas=[fila(999, TEMPORADA, estadisticas(t119=90))]))

    assert datos.estadisticas == []
    assert datos.jugadores == []


def test_dat003_se_cuentan_los_jugadores_con_minutos_de_la_temporada():
    datos = _mapear(
        _completo(),
        _con_detalles(12, estadisticas(t52=1)),
        _con_detalles(13, estadisticas(t119=0)),
    )

    assert contar_jugadores_con_minutos(datos) == 1


def test_dat003_la_nacionalidad_se_traduce_con_la_tabla_de_paises():
    [j] = _mapear(_completo(), paises={44: "Argentina"}).jugadores

    assert j.nacionalidad == "Argentina"


def test_dat003_un_pais_desconocido_o_sin_tabla_deja_la_nacionalidad_en_null():
    assert _mapear(_completo(), paises={999: "Otro"}).jugadores[0].nacionalidad is None
    assert _mapear(_completo()).jugadores[0].nacionalidad is None
