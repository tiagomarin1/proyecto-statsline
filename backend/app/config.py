"""Configuración leída de variables de entorno (y de backend/.env en desarrollo)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import make_url

RAIZ_REPO = Path(__file__).resolve().parents[2]
# El JWT HS256 de la sesión es tan fuerte como esta clave (ADR-0005)
LARGO_MINIMO_SECRET_KEY_PRODUCCION = 32


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    database_url_test: str | None = None
    # Contenido PEM del CA del servidor MySQL (Aiven exige TLS, ADR-0009). Vacío = sin TLS
    database_ssl_ca: str | None = None
    secret_key: str
    api_football_key: str = ""
    sesion_horas: int = 8
    demo_contrasena: str = ""
    entorno: Literal["desarrollo", "test", "produccion"] = "desarrollo"
    directorio_frontend: Path = RAIZ_REPO / "frontend" / "dist"

    @field_validator("database_url", "database_url_test")
    @classmethod
    def adaptar_url_mysql(cls, url: str | None) -> str | None:
        """Adapta la URL que entrega Aiven (mysql://...?ssl-mode=REQUIRED) a SQLAlchemy + PyMySQL.

        Se agrega el driver explícito y se saca ssl-mode, que PyMySQL no entiende: el TLS se
        configura con DATABASE_SSL_CA (ver app/db.py).
        """
        if not url:
            return url
        if url.startswith("mysql://"):
            url = "mysql+pymysql://" + url.removeprefix("mysql://")
        url_parseada = make_url(url)
        if {"ssl-mode", "ssl_mode"} & set(url_parseada.query):
            url_parseada = url_parseada.difference_update_query(["ssl-mode", "ssl_mode"])
            return url_parseada.render_as_string(hide_password=False)
        return url

    @model_validator(mode="after")
    def exigir_secret_key_larga_en_produccion(self) -> "Configuracion":
        if (
            self.entorno == "produccion"
            and len(self.secret_key) < LARGO_MINIMO_SECRET_KEY_PRODUCCION
        ):
            raise ValueError(
                f"SECRET_KEY tiene que tener al menos {LARGO_MINIMO_SECRET_KEY_PRODUCCION} "
                "caracteres en producción."
            )
        return self


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
