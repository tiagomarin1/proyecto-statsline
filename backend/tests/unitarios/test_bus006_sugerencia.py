"""BUS-006: elegir qué filtro sugerir relajar cuando no hay resultados (RN-016)."""

from app.servicios.busqueda import elegir_sugerencia


def test_bus006_se_sugiere_el_filtro_que_mas_resultados_da():
    sugerencia = elegir_sugerencia({"posicion": 2, "pases_min": 7, "minutos_min": 3})

    assert sugerencia.model_dump() == {
        "filtro": "pases_min",
        "etiqueta": "el mínimo de pases",
        "cantidad": 7,
    }


def test_bus006_con_empate_gana_el_primero_del_orden_de_rn016():
    # Orden: posición, liga, presupuesto, pases, duelos, recuperaciones, minutos
    sugerencia = elegir_sugerencia({"minutos_min": 5, "liga_id": 5, "duelos_min": 5})

    assert sugerencia.filtro == "liga_id"
    assert sugerencia.etiqueta == "la liga"


def test_bus006_si_ninguno_da_resultados_no_se_sugiere_nada():
    assert elegir_sugerencia({"posicion": 0, "pases_min": 0}) is None


def test_bus006_sin_filtros_para_relajar_no_se_sugiere_nada():
    assert elegir_sugerencia({}) is None
