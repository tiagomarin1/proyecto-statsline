"""AUT-001: validación del registro (RN-022), con los mensajes del prototipo."""

import pytest

from app.esquemas.auth import PedidoRegistro
from app.modelos.enums import Rol
from app.servicios.auth import normalizar_email, validar_registro

DATOS_VALIDOS = PedidoRegistro(
    nombre="Javier Ledesma",
    email="javier@deportivonorte.com",
    rol="director_tecnico",
    club="Deportivo Norte",
    contrasena="una-contrasena",
    acepta_terminos=True,
)


def _errores(**cambios) -> dict[str, str]:
    datos = DATOS_VALIDOS.model_copy(update=cambios)
    return {error.campo: error.mensaje for error in validar_registro(datos)}


def test_aut001_datos_completos_no_tienen_errores():
    assert _errores() == {}


@pytest.mark.parametrize("rol", [rol.value for rol in Rol])
def test_aut001_se_aceptan_los_4_roles(rol: str):
    assert _errores(rol=rol) == {}


@pytest.mark.parametrize(
    ("campo", "valor", "mensaje"),
    [
        ("nombre", "   ", "Completá tu nombre y apellido."),
        ("nombre", None, "Completá tu nombre y apellido."),
        ("email", "", "Completá tu correo electrónico."),
        ("email", "javier@club", "Ese correo no parece válido."),
        ("email", "javier club@club.com", "Ese correo no parece válido."),
        ("rol", "", "Elegí tu rol en el club."),
        ("rol", "presidente", "Elegí tu rol en el club."),
        ("club", "  ", "Completá el nombre de tu club."),
        ("contrasena", "", "Elegí una contraseña."),
        ("contrasena", "12345", "Le faltan 3 caracteres: el mínimo es 8."),
        ("contrasena", "1", "Le faltan 7 caracteres: el mínimo es 8."),
        (
            "acepta_terminos",
            False,
            "Hay que aceptar los términos y condiciones para crear la cuenta.",
        ),
    ],
)
def test_aut001_cada_campo_invalido_tiene_su_mensaje(campo: str, valor, mensaje: str):
    assert _errores(**{campo: valor}) == {campo: mensaje}


def test_aut001_una_contrasena_de_8_caracteres_alcanza():
    assert _errores(contrasena="12345678") == {}


def test_aut001_sin_rol_ni_terminos_se_marcan_los_dos_campos():
    assert set(_errores(rol="", acepta_terminos=False)) == {"rol", "acepta_terminos"}


def test_aut001_el_email_se_normaliza_sin_espacios_y_en_minusculas():
    assert normalizar_email("  Javier@DeportivoNorte.com ") == "javier@deportivonorte.com"


def test_aut001_un_email_con_espacios_alrededor_es_valido():
    assert _errores(email="  Javier@DeportivoNorte.com ") == {}
