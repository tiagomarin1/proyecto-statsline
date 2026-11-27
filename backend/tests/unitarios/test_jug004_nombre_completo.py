"""JUG-004: nombre completo del jugador (RN-038)."""

from app.servicios.nombre_completo import nombre_completo


def test_jug004_con_nombre_de_pila_y_apellido():
    assert nombre_completo("L. Magallán", "Lisandro", "Magallán") == "Lisandro Magallán"


def test_jug004_solo_apellido():
    assert nombre_completo("M. Rojo", None, "Rojo") == "Rojo"


def test_jug004_solo_nombre_de_pila():
    assert nombre_completo("M. Rojo", "Marcos", None) == "Marcos"


def test_jug004_sin_nombre_de_pila_ni_apellido_usa_el_nombre():
    assert nombre_completo("Ander Herrera", None, None) == "Ander Herrera"


def test_jug004_saca_espacios_de_los_bordes_y_dobles():
    assert nombre_completo("Á. Correa", "  Ángel  Martín ", " Correa ") == "Ángel Martín Correa"


def test_jug004_solo_espacios_cuenta_como_que_falta():
    assert nombre_completo("S. Arias", "   ", "Arias") == "Arias"
    assert nombre_completo("S. Arias", "", "  ") == "S. Arias"


def test_jug004_conserva_tildes_y_mayusculas():
    assert nombre_completo("Á. Di María", "Ángel Fabián", "Di María Hernández") == (
        "Ángel Fabián Di María Hernández"
    )


def test_jug004_el_nombre_de_la_fuente_tambien_se_limpia():
    assert nombre_completo("  Ander   Herrera ", None, None) == "Ander Herrera"
