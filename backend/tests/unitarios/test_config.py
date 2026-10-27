"""INF-001: configuración por variables de entorno y conexión a MySQL (ADR-0009)."""

import ssl
from datetime import UTC, datetime, timedelta

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


def test_inf001_la_url_mysql_pasa_a_usar_pymysql():
    configuracion = _configuracion("mysql://usuario:clave@host:3306/defaultdb")

    assert configuracion.database_url == "mysql+pymysql://usuario:clave@host:3306/defaultdb"


def test_inf001_la_url_de_aiven_pierde_ssl_mode_y_conserva_la_clave():
    configuracion = _configuracion(
        "mysql://avnadmin:cl%40ve@mysql-x.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED"
    )

    assert (
        configuracion.database_url
        == "mysql+pymysql://avnadmin:cl%40ve@mysql-x.aivencloud.com:12345/defaultdb"
    )


def test_inf001_la_url_con_pymysql_no_se_modifica():
    url = "mysql+pymysql://statsline:statsline@localhost:3306/statsline_dev"

    assert _configuracion(url).database_url == url


def test_inf001_sin_ca_la_conexion_no_usa_tls():
    assert argumentos_de_conexion(None) == {"charset": "utf8mb4"}


def test_inf001_con_ca_la_conexion_usa_tls_y_verifica_el_servidor(ca_pem: str):
    contexto = argumentos_de_conexion(ca_pem)["ssl"]

    assert isinstance(contexto, ssl.SSLContext)
    assert contexto.verify_mode == ssl.CERT_REQUIRED
    assert contexto.check_hostname is True
    assert contexto.get_ca_certs()[0]["subject"] == ((("commonName", "CA de prueba"),),)


def test_inf001_el_ca_en_una_sola_linea_con_barra_n_tambien_sirve(ca_pem: str):
    contexto = argumentos_de_conexion(ca_pem.replace("\n", "\\n"))["ssl"]

    assert len(contexto.get_ca_certs()) == 1
