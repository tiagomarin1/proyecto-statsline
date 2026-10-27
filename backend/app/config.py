"""Configuración leída de variables de entorno (y de backend/.env en desarrollo)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_REPO = Path(__file__).resolve().parents[2]


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    database_url_test: str | None = None
    secret_key: str
    api_football_key: str = ""
    sesion_horas: int = 8
    demo_contrasena: str = ""
    entorno: Literal["desarrollo", "test", "produccion"] = "desarrollo"
    directorio_frontend: Path = RAIZ_REPO / "frontend" / "dist"

    @field_validator("database_url", "database_url_test")
    @classmethod
    def usar_driver_pymysql(cls, url: str | None) -> str | None:
        """Railway entrega la URL como mysql://; SQLAlchemy necesita el driver explícito."""
        if url and url.startswith("mysql://"):
            return "mysql+pymysql://" + url.removeprefix("mysql://")
        return url


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
