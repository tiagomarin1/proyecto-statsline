"""AUT-001: la cookie de sesión es httpOnly, SameSite=Lax y Secure en producción (ADR-0005)."""

import pytest
from fastapi import Response

from app.config import Configuracion
from app.seguridad import sesion


def _cookie(monkeypatch: pytest.MonkeyPatch, entorno: str) -> str:
    configuracion = Configuracion(
        database_url="postgres://u:c@h/db", secret_key="x" * 32, entorno=entorno
    )
    monkeypatch.setattr(sesion, "obtener_configuracion", lambda: configuracion)
    monkeypatch.setattr("app.seguridad.tokens.obtener_configuracion", lambda: configuracion)
    response = Response()
    sesion.escribir_cookie_sesion(response, usuario_id=7)
    return response.headers["set-cookie"]


def test_aut001_en_produccion_la_cookie_es_secure(monkeypatch: pytest.MonkeyPatch):
    cookie = _cookie(monkeypatch, "produccion")

    assert "Secure" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie


def test_aut001_en_desarrollo_la_cookie_no_es_secure(monkeypatch: pytest.MonkeyPatch):
    # En http://localhost el navegador no guardaría una cookie Secure
    assert "Secure" not in _cookie(monkeypatch, "desarrollo")
