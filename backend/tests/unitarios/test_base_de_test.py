"""INF-001: los tests nunca borran una base que no sea de test."""

import pytest

from tests.base_de_test import validar_nombre_base_de_test


def test_inf001_una_base_terminada_en_test_se_acepta():
    assert validar_nombre_base_de_test("statsline_test") == "statsline_test"


@pytest.mark.parametrize("nombre", ["statsline_dev", "defaultdb", "test_statsline", "", None])
def test_inf001_una_base_que_no_termina_en_test_se_rechaza(nombre):
    with pytest.raises(ValueError, match="tiene que terminar en '_test'"):
        validar_nombre_base_de_test(nombre)
