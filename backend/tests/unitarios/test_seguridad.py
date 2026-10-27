"""INF-001: hash de contraseñas y token de sesión (ADR-0005)."""

from datetime import UTC, datetime, timedelta

import jwt

from app.config import obtener_configuracion
from app.seguridad.contrasenas import hashear_contrasena, verificar_contrasena
from app.seguridad.tokens import crear_token_sesion, leer_token_sesion


def test_inf001_el_hash_es_argon2_y_no_contiene_la_contrasena():
    hash_contrasena = hashear_contrasena("una-contrasena-segura")

    assert hash_contrasena.startswith("$argon2")
    assert "una-contrasena-segura" not in hash_contrasena


def test_inf001_verificar_contrasena_acepta_la_correcta_y_rechaza_otra():
    hash_contrasena = hashear_contrasena("una-contrasena-segura")

    assert verificar_contrasena("una-contrasena-segura", hash_contrasena)
    assert not verificar_contrasena("otra-contrasena", hash_contrasena)


def test_inf001_token_de_sesion_devuelve_el_id_del_usuario():
    assert leer_token_sesion(crear_token_sesion(42)) == 42


def test_inf001_token_vencido_despues_de_8_horas_no_es_valido():
    hace_9_horas = datetime.now(UTC) - timedelta(hours=9)

    assert leer_token_sesion(crear_token_sesion(42, ahora=hace_9_horas)) is None


def test_inf001_token_dentro_de_las_8_horas_sigue_valido():
    hace_7_horas = datetime.now(UTC) - timedelta(hours=7)

    assert leer_token_sesion(crear_token_sesion(42, ahora=hace_7_horas)) == 42


def test_inf001_token_firmado_con_otra_clave_no_es_valido():
    token_falso = jwt.encode({"sub": "42"}, "otra-clave-cualquiera-de-32-bytes!!", "HS256")

    assert leer_token_sesion(token_falso) is None


def test_inf001_token_basura_no_es_valido():
    assert leer_token_sesion("esto-no-es-un-jwt") is None


def test_inf001_token_sin_vencimiento_no_es_valido():
    token = jwt.encode({"sub": "42"}, obtener_configuracion().secret_key, "HS256")

    assert leer_token_sesion(token) is None
