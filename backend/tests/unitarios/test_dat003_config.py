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
