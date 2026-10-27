"""Sirve el build de React (frontend/dist) desde FastAPI (ADR-0003)."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Rutas que nunca devuelven index.html, para que un 404 de la API siga siendo JSON
PREFIJOS_RESERVADOS = ("api/", "docs", "redoc", "openapi.json")


def montar_frontend(app: FastAPI, directorio: Path) -> None:
    """Devuelve el archivo pedido si existe en el build y, si no, index.html (ruteo del SPA).

    Si el build no existe (por ejemplo, en desarrollo con Vite), no monta nada.
    """
    raiz = directorio.resolve()
    index = raiz / "index.html"
    if not index.is_file():
        return

    @app.get("/{ruta:path}", include_in_schema=False)
    def servir_frontend(ruta: str) -> FileResponse:
        if ruta.startswith(PREFIJOS_RESERVADOS):
            raise StarletteHTTPException(status_code=404)
        archivo = (raiz / ruta).resolve()
        if ruta and archivo.is_file() and archivo.is_relative_to(raiz):
            return FileResponse(archivo)
        return FileResponse(index)
