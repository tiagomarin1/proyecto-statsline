"""DAT-003: el token de Sportmonks se lee de SPORTMONKS_TOKEN (solo del entorno, nunca del repo)."""

import pytest

from app.config import Configuracion


def _configuracion(**extra) -> Configuracion:
    return Configuracion(database_url="postgresql+psycopg://u:p@h/db", secret_key="x", **extra)


def test_dat003_sin_token_queda_vacio(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("SPORTMONKS_TOKEN", raising=False)

    assert _configuracion(_env_file=None).sportmonks_token == ""


def test_dat003_el_token_se_lee_de_sportmonks_token(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SPORTMONKS_TOKEN", "token-de-prueba")

    assert _configuracion(_env_file=None).sportmonks_token == "token-de-prueba"


@pytest.mark.parametrize("valor", ["token-de-prueba\n", " token-de-prueba ", "token-de-prueba\r\n"])
def test_dat003_el_token_se_lee_sin_espacios_ni_saltos_de_linea(
    monkeypatch: pytest.MonkeyPatch, valor: str
):
    # Un secret pegado con un salto de línea al final rompe el header Authorization
    # (httpx tira LocalProtocolError en cada pedido): pasó el 25/11/2026 en Actions
    monkeypatch.setenv("SPORTMONKS_TOKEN", valor)

    assert _configuracion(_env_file=None).sportmonks_token == "token-de-prueba"


def test_dat003_la_clave_de_api_football_se_lee_sin_espacios(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("API_FOOTBALL_KEY", "clave-de-prueba\n")

    assert _configuracion(_env_file=None).api_football_key == "clave-de-prueba"


def test_dat003_la_url_de_la_base_se_lee_sin_salto_de_linea(monkeypatch: pytest.MonkeyPatch):
    # Mismo problema que el token: libpq rechaza "sslmode=require\n"
    monkeypatch.setenv("DATABASE_URL", "postgres://u:c@h:5432/db?sslmode=require\n")
    monkeypatch.setenv("DATABASE_URL_TEST", " postgres://u:c@h:5432/test\r\n")

    configuracion = Configuracion(_env_file=None, secret_key="x")

    assert configuracion.database_url == "postgresql+psycopg://u:c@h:5432/db?sslmode=require"
    assert configuracion.database_url_test == "postgresql+psycopg://u:c@h:5432/test"
