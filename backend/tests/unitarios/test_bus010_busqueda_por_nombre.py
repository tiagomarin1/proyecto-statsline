"""BUS-010: la regla de la búsqueda por nombre (RN-035) y la validación del filtro."""

import pytest
from pydantic import ValidationError

from app.esquemas.busqueda import NOMBRE_LARGO_MAXIMO, FiltrosBusqueda
from app.servicios.busqueda_por_nombre import coincide_con_nombre, palabras_de_busqueda
from tests.ejemplo_rn035 import CASOS_RN035, JUGADORES_RN035


@pytest.mark.parametrize(
    ("texto", "palabras"),
    [
        ("MAGALLAN", ["magallan"]),
        ("S. Arias", ["s", "arias"]),
        ("  maría   ángel ", ["maria", "angel"]),
        ("Pérez-García", ["perez", "garcia"]),
        ("arias arias", ["arias"]),
    ],
)
def test_bus010_el_texto_se_normaliza_y_se_separa_en_palabras(texto: str, palabras: list[str]):
    assert palabras_de_busqueda(texto) == palabras


@pytest.mark.parametrize("texto", [None, "", "   ", "...", "¿?"])
def test_bus010_texto_sin_letras_ni_numeros_no_tiene_palabras(texto: str | None):
    assert palabras_de_busqueda(texto) == []


@pytest.mark.parametrize(("texto", "esperados"), CASOS_RN035)
def test_bus010_ejemplo_de_rn035(texto: str, esperados: list[str]):
    coinciden = [
        nombre
        for nombre, nombre_pila, apellido in JUGADORES_RN035
        if coincide_con_nombre(texto, nombre, nombre_pila, apellido)
    ]

    assert coinciden == esperados


def test_bus010_apellido_sin_tildes_ni_mayusculas():
    assert coincide_con_nombre("MAGALLAN", "L. Magallán", "Lisandro", "Magallán")


def test_bus010_nombre_abreviado_como_se_ve_en_la_lista():
    assert coincide_con_nombre("S. Arias", "S. Arias", "Santiago", "Arias Naranjo")
    assert not coincide_con_nombre("S. Arias", "Á. Correa", "Ángel Martín", "Correa Martínez")


def test_bus010_nombre_de_pila_y_apellido_completos():
    assert coincide_con_nombre("santiago arias", "S. Arias", "Santiago", "Arias Naranjo")


def test_bus010_el_orden_de_las_palabras_no_importa():
    assert coincide_con_nombre("maría ángel", "Á. Di María", "Ángel Fabián", "Di María Hernández")


def test_bus010_coincide_desde_el_comienzo_de_la_palabra_y_no_en_el_medio():
    assert coincide_con_nombre("ari", "S. Arias", "Santiago", "Arias Naranjo")
    assert not coincide_con_nombre("rias", "S. Arias", "Santiago", "Arias Naranjo")


def test_bus010_todas_las_palabras_tienen_que_coincidir():
    assert not coincide_con_nombre("santiago correa", "S. Arias", "Santiago", "Arias Naranjo")


def test_bus010_jugador_sin_nombre_de_pila_ni_apellido():
    assert coincide_con_nombre("sosa", "J. Sosa", None, None)
    assert not coincide_con_nombre("juan", "J. Sosa", None, None)


@pytest.mark.parametrize("texto", [None, "", "...", "   "])
def test_bus010_texto_sin_palabras_equivale_a_sin_filtro(texto: str | None):
    assert coincide_con_nombre(texto, "S. Arias", "Santiago", "Arias Naranjo")


# --- Validación del filtro ---


def test_bus010_un_nombre_vacio_equivale_a_sin_filtro():
    assert FiltrosBusqueda.model_validate({"nombre": ""}).nombre is None
    assert FiltrosBusqueda().nombre is None


def test_bus010_el_nombre_se_guarda_tal_como_se_escribio():
    assert FiltrosBusqueda(nombre="S. Beltrán").nombre == "S. Beltrán"


def test_bus010_un_nombre_de_60_caracteres_es_valido():
    assert NOMBRE_LARGO_MAXIMO == 60
    assert FiltrosBusqueda(nombre="a" * 60).nombre == "a" * 60


def test_bus010_un_nombre_de_mas_de_60_caracteres_es_invalido():
    with pytest.raises(ValidationError):
        FiltrosBusqueda(nombre="a" * 61)
