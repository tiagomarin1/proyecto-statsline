"""AUT-002: el ingreso no revela si falló el email o la contraseña (RN-022)."""

from unittest.mock import MagicMock

import pytest

from app.errores import ErrorApi
from app.servicios import auth


def test_aut002_con_un_email_inexistente_igual_se_verifica_una_contrasena(
    monkeypatch: pytest.MonkeyPatch,
):
    # Así el tiempo de respuesta no delata si el email existe
    verificar = MagicMock(return_value=False)
    monkeypatch.setattr(auth.repositorio_usuario, "obtener_por_email", lambda *_: None)
    monkeypatch.setattr(auth, "verificar_contrasena", verificar)

    with pytest.raises(ErrorApi) as error:
        auth.ingresar(MagicMock(), "nadie@club.com", "lo-que-sea")

    assert error.value.status_code == 401
    assert error.value.codigo == "credenciales_invalidas"
    verificar.assert_called_once()
