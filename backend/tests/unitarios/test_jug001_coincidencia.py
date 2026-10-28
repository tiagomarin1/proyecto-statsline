"""JUG-001: coincidencia del jugador con el perfil o los filtros (RN-012), como función pura."""

from app.esquemas.busqueda import FiltrosBusqueda
from app.modelos.enums import Posicion
from app.servicios.coincidencia import DatosJugadorCoincidencia, evaluar_coincidencia

LIGA = "Primera C"


def _jugador(
    *,
    posicion=Posicion.defensor,
    edad=24,
    valor_mercado_eur=120_000,
    **metricas,
) -> DatosJugadorCoincidencia:
    return DatosJugadorCoincidencia(
        posicion=posicion,
        edad=edad,
        valor_mercado_eur=valor_mercado_eur,
        liga=LIGA,
        metricas={
            "pases_precision_pct": None,
            "duelos_ganados_pct": None,
            "recuperaciones_por_partido": None,
            "minutos_jugados": None,
            **metricas,
        },
    )


def _estados(coincidencia) -> dict[str, str]:
    return {c.criterio: c.estado for c in coincidencia.criterios}


def test_jug001_rn012_ejemplo_de_la_regla_cumple_3_de_4():
    # Perfil Defensor, 20-27 años, € 150.000, pases >= 80; el jugador no tiene pases
    filtros = FiltrosBusqueda(
        posicion="defensor", edad_min=20, edad_max=27, presupuesto_max_eur=150_000, pases_min=80
    )

    coincidencia = evaluar_coincidencia(filtros, _jugador())

    assert (coincidencia.cumple, coincidencia.total) == (3, 4)
    assert [(c.criterio, c.estado) for c in coincidencia.criterios] == [
        ("posicion", "cumple"),
        ("edad", "cumple"),
        ("presupuesto", "cumple"),
        ("pases_min", "no_disponible"),
    ]
    assert coincidencia.criterios[0].texto == "Juega de Defensor"
    assert coincidencia.criterios[3].texto == "Primera C no publica esta métrica."


def test_jug001_rn012_sin_filtros_no_hay_coincidencia():
    assert evaluar_coincidencia(FiltrosBusqueda(), _jugador()) is None


def test_jug001_rn012_solo_la_liga_no_es_un_criterio():
    assert evaluar_coincidencia(FiltrosBusqueda(liga_id=3), _jugador()) is None


def test_jug001_rn012_sin_posicion_filtrada_el_criterio_cumple_con_cualquier_posicion():
    coincidencia = evaluar_coincidencia(FiltrosBusqueda(edad_min=20), _jugador())

    posicion = coincidencia.criterios[0]
    assert (posicion.criterio, posicion.estado, posicion.texto) == (
        "posicion",
        "cumple",
        "Cualquier posición",
    )
    assert coincidencia.total == 2


def test_jug001_rn012_otra_posicion_no_cumple():
    filtros = FiltrosBusqueda(posicion="delantero")

    coincidencia = evaluar_coincidencia(filtros, _jugador())

    assert _estados(coincidencia)["posicion"] == "no_cumple"
    assert coincidencia.criterios[0].texto == "Juega de Defensor, no de Delantero"


def test_jug001_rn012_jugador_sin_posicion_es_no_disponible():
    coincidencia = evaluar_coincidencia(
        FiltrosBusqueda(posicion="defensor"), _jugador(posicion=None)
    )

    assert _estados(coincidencia)["posicion"] == "no_disponible"


def test_jug001_rn012_la_edad_incluye_los_extremos():
    filtros = FiltrosBusqueda(edad_min=20, edad_max=27)

    assert _estados(evaluar_coincidencia(filtros, _jugador(edad=20)))["edad"] == "cumple"
    assert _estados(evaluar_coincidencia(filtros, _jugador(edad=27)))["edad"] == "cumple"
    assert _estados(evaluar_coincidencia(filtros, _jugador(edad=28)))["edad"] == "no_cumple"


def test_jug001_rn012_sin_fecha_de_nacimiento_la_edad_es_no_disponible():
    coincidencia = evaluar_coincidencia(FiltrosBusqueda(edad_max=27), _jugador(edad=None))

    assert _estados(coincidencia)["edad"] == "no_disponible"


def test_jug001_rn012_presupuesto_solo_si_hay_presupuesto():
    coincidencia = evaluar_coincidencia(FiltrosBusqueda(posicion="defensor"), _jugador())

    assert "presupuesto" not in _estados(coincidencia)


def test_jug001_rn012_presupuesto_superado_no_cumple_y_sin_valor_es_no_disponible():
    filtros = FiltrosBusqueda(presupuesto_max_eur=100_000)

    caro = evaluar_coincidencia(filtros, _jugador(valor_mercado_eur=120_000))
    sin_valor = evaluar_coincidencia(filtros, _jugador(valor_mercado_eur=None))

    assert _estados(caro)["presupuesto"] == "no_cumple"
    assert caro.criterios[1].texto == "Vale € 120.000 y el presupuesto es € 100.000"
    assert _estados(sin_valor)["presupuesto"] == "no_disponible"
    assert sin_valor.criterios[1].texto == "Costo no disponible"


def test_jug001_rn012_un_criterio_por_cada_minimo_tactico_cargado():
    filtros = FiltrosBusqueda(pases_min=80, duelos_min=50, minutos_min=900)
    jugador = _jugador(pases_precision_pct=86.5, duelos_ganados_pct=45.0, minutos_jugados=900)

    coincidencia = evaluar_coincidencia(filtros, jugador)

    assert _estados(coincidencia) == {
        "posicion": "cumple",
        "pases_min": "cumple",
        "duelos_min": "no_cumple",
        "minutos_min": "cumple",
    }
    assert (coincidencia.cumple, coincidencia.total) == (3, 4)
