"""AUT-003: token del link para recuperar la contraseña (RN-036)."""

from datetime import UTC, datetime, timedelta

from app.seguridad.tokens import (
    crear_token_recuperacion,
    crear_token_sesion,
    huella_de_contrasena,
    leer_token_recuperacion,
    leer_token_sesion,
)

HASH = "$argon2id$v=19$m=65536,t=3,p=4$hash-de-prueba"


def test_aut003_el_token_lleva_el_usuario_y_la_huella_de_la_contrasena():
    token = crear_token_recuperacion(7, HASH)

    assert leer_token_recuperacion(token) == (7, huella_de_contrasena(HASH))


def test_aut003_la_huella_cambia_si_cambia_la_contrasena():
    assert huella_de_contrasena(HASH) != huella_de_contrasena(HASH + "otro")
    assert len(huella_de_contrasena(HASH)) == 16


def test_aut003_rn036_el_token_vence_a_los_60_minutos():
    emitido = datetime.now(UTC) - timedelta(minutes=61)

    assert leer_token_recuperacion(crear_token_recuperacion(7, HASH, ahora=emitido)) is None


def test_aut003_rn036_a_los_59_minutos_todavia_sirve():
    emitido = datetime.now(UTC) - timedelta(minutes=59)

    assert leer_token_recuperacion(crear_token_recuperacion(7, HASH, ahora=emitido)) is not None


def test_aut003_un_token_adulterado_o_basura_no_sirve():
    token = crear_token_recuperacion(7, HASH)

    assert leer_token_recuperacion(token[:-2] + "xx") is None
    assert leer_token_recuperacion("no-es-un-token") is None
    assert leer_token_recuperacion("") is None


def test_aut003_el_token_de_recuperacion_no_sirve_como_sesion_ni_al_reves():
    assert leer_token_sesion(crear_token_recuperacion(7, HASH)) is None
    assert leer_token_recuperacion(crear_token_sesion(7)) is None
