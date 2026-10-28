"""DAT-002: cruce de jugadores con Transfermarkt (RN-002), como función pura."""

from datetime import date

import pytest

from app.integraciones.lector_transfermarkt import FilaTransfermarkt
from app.servicios.valor_mercado import (
    JugadorParaCruce,
    ResultadoCruce,
    cruzar_jugadores,
    normalizar_nombre,
)

NACIMIENTO = date(2001, 5, 10)


def _jugador(id_=1, *, nombre="J. Pérez", nombre_pila="Juan", apellido="Pérez", fecha=NACIMIENTO):
    return JugadorParaCruce(
        id=id_, nombre=nombre, nombre_pila=nombre_pila, apellido=apellido, fecha_nacimiento=fecha
    )


def _fila(id_tm=100, *, nombre="Juan Perez", fecha=NACIMIENTO, valor=120_000):
    return FilaTransfermarkt(
        id_transfermarkt=id_tm, nombre=nombre, fecha_nacimiento=fecha, valor_mercado_eur=valor
    )


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("Juan Pérez", "juan perez"),
        ("  NICOLÁS   Otamendi ", "nicolas otamendi"),
        ("Ángel Di María", "angel di maria"),
        ("Iñaki O'Neill-Núñez", "inaki o neill nunez"),
        ("Müller", "muller"),
        ("", ""),
        (None, ""),
    ],
)
def test_dat002_rn002_normalizar_nombre(texto, esperado):
    assert normalizar_nombre(texto) == esperado


def test_dat002_rn002_coincidencia_unica_por_nombre_de_pila_y_apellido():
    cruce = cruzar_jugadores([_jugador()], [_fila(), _fila(200, nombre="Otro Jugador")])[1]

    assert cruce.resultado == ResultadoCruce.cruzado
    assert cruce.fila.id_transfermarkt == 100


def test_dat002_rn002_coincidencia_por_el_nombre_corto_de_api_football():
    jugador = _jugador(nombre="Ander Herrera", nombre_pila="Ander", apellido="Herrera Agüera")

    cruce = cruzar_jugadores([jugador], [_fila(nombre="Ander Herrera")])[1]

    assert cruce.resultado == ResultadoCruce.cruzado


def test_dat002_rn002_con_otra_fecha_no_hay_coincidencia():
    cruce = cruzar_jugadores([_jugador()], [_fila(fecha=date(2001, 5, 11))])[1]

    assert cruce.resultado == ResultadoCruce.sin_coincidencia
    assert cruce.fila is None


def test_dat002_rn002_dos_filas_iguales_es_ambiguo():
    cruce = cruzar_jugadores([_jugador()], [_fila(100), _fila(200, valor=90_000)])[1]

    assert cruce.resultado == ResultadoCruce.ambiguo
    assert cruce.fila is None


def test_dat002_rn002_sin_fecha_de_nacimiento_no_se_intenta_el_cruce():
    cruce = cruzar_jugadores([_jugador(fecha=None)], [_fila(fecha=None)])[1]

    assert cruce.resultado == ResultadoCruce.sin_fecha


def test_dat002_rn002_propuesta_cruce_por_palabras_con_segundo_nombre_y_apellido():
    # Ejemplo de la propuesta: "Néstor Fernando" + "Muslera Micol" vs "Fernando Muslera"
    muslera = _jugador(
        nombre="F. Muslera",
        nombre_pila="Néstor Fernando",
        apellido="Muslera Micol",
        fecha=date(1986, 6, 16),
    )
    fila = _fila(58088, nombre="Fernando Muslera", fecha=date(1986, 6, 16), valor=700_000)

    cruce = cruzar_jugadores([muslera], [fila])[1]

    assert cruce.resultado == ResultadoCruce.cruzado
    assert cruce.fila.valor_mercado_eur == 700_000


def test_dat002_rn002_propuesta_la_coincidencia_exacta_gana_sobre_la_de_palabras():
    jugador = _jugador(nombre_pila="Juan Carlos", apellido="Pérez")
    exacta = _fila(100, nombre="Juan Carlos Perez")
    por_palabras = _fila(200, nombre="Juan Perez")

    cruce = cruzar_jugadores([jugador], [exacta, por_palabras])[1]

    assert cruce.resultado == ResultadoCruce.cruzado
    assert cruce.fila.id_transfermarkt == 100


def test_dat002_rn002_propuesta_dos_candidatos_por_palabras_es_ambiguo():
    jugador = _jugador(nombre_pila="Juan Carlos", apellido="Pérez López")

    cruce = cruzar_jugadores(
        [jugador], [_fila(100, nombre="Juan Perez"), _fila(200, nombre="Carlos Lopez")]
    )[1]

    assert cruce.resultado == ResultadoCruce.ambiguo


def test_dat002_rn002_propuesta_un_nombre_de_una_sola_palabra_no_cruza_por_palabras():
    # "Perez" sola está contenida en casi cualquier nombre: no alcanza
    cruce = cruzar_jugadores([_jugador()], [_fila(nombre="Perez")])[1]

    assert cruce.resultado == ResultadoCruce.sin_coincidencia


def test_dat002_rn002_propuesta_una_palabra_que_no_esta_en_api_football_no_cruza():
    cruce = cruzar_jugadores([_jugador()], [_fila(nombre="Juan Pablo Perez")])[1]

    assert cruce.resultado == ResultadoCruce.sin_coincidencia


def test_dat002_dos_jugadores_que_cruzan_con_la_misma_fila_quedan_ambiguos():
    # id_transfermarkt es único: la fila no se le puede asignar a los dos
    uno = _jugador(1)
    otro = _jugador(2, nombre="Juan Perez", nombre_pila=None, apellido=None)

    cruces = cruzar_jugadores([uno, otro], [_fila()])

    assert cruces[1].resultado == ResultadoCruce.ambiguo
    assert cruces[2].resultado == ResultadoCruce.ambiguo


def test_dat002_un_cruce_sin_valor_en_el_csv_queda_cruzado_con_valor_none():
    cruce = cruzar_jugadores([_jugador()], [_fila(valor=None)])[1]

    assert cruce.resultado == ResultadoCruce.cruzado
    assert cruce.fila.valor_mercado_eur is None
