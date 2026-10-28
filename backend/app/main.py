"""Crea la app de FastAPI, monta los routers y sirve el build de React."""

from pathlib import Path

from fastapi import FastAPI

from app.config import obtener_configuracion
from app.errores import registrar_manejadores_de_errores
from app.frontend import montar_frontend
from app.routers import jugadores, ligas, salud

PREFIJO_API = "/api/v1"


def crear_app(directorio_frontend: Path | None = None) -> FastAPI:
    app = FastAPI(title="StatsLine API", version="0.1.0")
    registrar_manejadores_de_errores(app)

    # Cada feature agrega solo la línea de su router (PLAN_BACKEND.md)
    app.include_router(salud.router, prefix=PREFIJO_API)
    app.include_router(ligas.router, prefix=PREFIJO_API)
    app.include_router(jugadores.router, prefix=PREFIJO_API)

    # Va al final: la ruta comodín del SPA no tiene que tapar a la API
    montar_frontend(app, directorio_frontend or obtener_configuracion().directorio_frontend)
    return app


app = crear_app()
