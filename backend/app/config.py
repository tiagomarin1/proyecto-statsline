"""Configuración leída de variables de entorno (y de backend/.env en desarrollo)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_REPO = Path(__file__).resolve().parents[2]
# El JWT HS256 de la sesión es tan fuerte como esta clave (ADR-0005)
LARGO_MINIMO_SECRET_KEY_PRODUCCION = 32
PREFIJO_POSTGRESQL_PSYCOPG = "postgresql+psycopg://"


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    database_url_test: str | None = None
    # Contenido PEM del CA del servidor PostgreSQL (Aiven exige TLS, ADR-0009). Vacío = sin TLS
    database_ssl_ca: str | None = None
    secret_key: str
    api_football_key: str = ""
    sesion_horas: int = 8
    demo_contrasena: str = ""
    entorno: Literal["desarrollo", "test", "produccion"] = "desarrollo"
    directorio_frontend: Path = RAIZ_REPO / "frontend" / "dist"

    @field_validator("database_url", "database_url_test")
    @classmethod
    def adaptar_url_postgresql(cls, url: str | None) -> str | None:
        """Agrega el driver psycopg a la URL que entrega Aiven (postgres://...?sslmode=require).

        El resto de la URL, incluido sslmode, se deja igual: libpq lo entiende. La verificación
        del servidor se configura con DATABASE_SSL_CA (ver app/db.py).
        """
        if not url:
            return url
        for prefijo in ("postgres://", "postgresql://"):
            if url.startswith(prefijo):
                return PREFIJO_POSTGRESQL_PSYCOPG + url.removeprefix(prefijo)
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
