"""INF-001: configuración por variables de entorno y conexión a PostgreSQL (ADR-0009 y 0010)."""

import ssl
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from app.config import Configuracion
from app.db import argumentos_de_conexion


def _configuracion(url: str) -> Configuracion:
    return Configuracion(database_url=url, secret_key="x")


@pytest.fixture(scope="module")
def ca_pem() -> str:
    """Un CA autofirmado, como el que entrega Aiven para verificar su servidor."""
    clave = ec.generate_private_key(ec.SECP256R1())
    nombre = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "CA de prueba")])
    ahora = datetime.now(UTC)
    certificado = (
        x509.CertificateBuilder()
        .subject_name(nombre)
        .issuer_name(nombre)
        .public_key(clave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(ahora)
        .not_valid_after(ahora + timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(clave, hashes.SHA256())
    )
    return certificado.public_bytes(serialization.Encoding.PEM).decode()


@pytest.mark.parametrize("prefijo", ["postgres://", "postgresql://"])
def test_inf001_la_url_postgresql_pasa_a_usar_psycopg(prefijo: str):
    configuracion = _configuracion(f"{prefijo}usuario:clave@host:5432/defaultdb")

    assert configuracion.database_url == "postgresql+psycopg://usuario:clave@host:5432/defaultdb"


def test_inf001_la_url_de_aiven_conserva_sslmode_y_la_clave():
    configuracion = _configuracion(
        "postgres://avnadmin:cl%40ve@pg-x.aivencloud.com:12345/defaultdb?sslmode=require"
    )

    assert (
        configuracion.database_url
        == "postgresql+psycopg://avnadmin:cl%40ve@pg-x.aivencloud.com:12345/defaultdb?sslmode=require"
    )


def test_inf001_la_url_con_psycopg_no_se_modifica():
    url = "postgresql+psycopg://statsline:statsline@localhost:5432/statsline_dev"

    assert _configuracion(url).database_url == url


def test_inf001_sin_ca_la_conexion_no_usa_tls_y_trabaja_en_utc():
    assert argumentos_de_conexion(None) == {"options": "-c timezone=UTC"}


def test_inf001_con_ca_la_conexion_usa_tls_y_verifica_el_servidor(ca_pem: str):
    argumentos = argumentos_de_conexion(ca_pem)

    assert argumentos["sslmode"] == "verify-full"
    assert argumentos["options"] == "-c timezone=UTC"
    assert Path(argumentos["sslrootcert"]).read_text() == ca_pem


def test_inf001_el_ca_en_una_sola_linea_con_barra_n_tambien_sirve(ca_pem: str):
    argumentos = argumentos_de_conexion(ca_pem.replace("\n", "\\n"))

    assert Path(argumentos["sslrootcert"]).read_text() == ca_pem


def test_inf001_un_ca_invalido_falla_antes_de_conectarse():
    with pytest.raises(ssl.SSLError):
        argumentos_de_conexion("esto no es un certificado")


def test_inf001_en_produccion_se_rechaza_una_secret_key_corta():
    with pytest.raises(ValueError, match="al menos 32 caracteres"):
        Configuracion(database_url="postgres://u:c@h/db", secret_key="corta", entorno="produccion")


def test_inf001_en_produccion_se_acepta_una_secret_key_de_32_caracteres():
    configuracion = Configuracion(
        database_url="postgres://u:c@h/db", secret_key="x" * 32, entorno="produccion"
    )

    assert configuracion.entorno == "produccion"


def test_inf001_en_desarrollo_una_secret_key_corta_se_permite():
    assert Configuracion(database_url="postgres://u:c@h/db", secret_key="x").secret_key == "x"
