"""Prepara la base al arrancar el contenedor: migraciones y semillas (ADR-0009).

El plan gratis de Render no tiene comando de pre-deploy, así que esto corre en el CMD del
Dockerfile, antes de uvicorn. Un bloqueo consultivo de PostgreSQL evita que dos contenedores que
arrancan a la vez (por ejemplo, dos deploys seguidos o un reinicio durante un deploy) migren al
mismo tiempo: el segundo espera y, cuando entra, ya no tiene nada que migrar.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import obtener_configuracion
from app.db import bloqueo_exclusivo, obtener_engine, obtener_fabrica_sesiones
from semillas.__main__ import cargar_semillas

ARCHIVO_ALEMBIC = Path(__file__).resolve().parents[1] / "alembic.ini"
NOMBRE_BLOQUEO = "statsline_preparar_base"
SEGUNDOS_ESPERA_BLOQUEO = 300


def preparar_base() -> list[str]:
    with (
        obtener_engine().connect() as conexion,
        bloqueo_exclusivo(conexion, NOMBRE_BLOQUEO, SEGUNDOS_ESPERA_BLOQUEO),
    ):
        command.upgrade(Config(str(ARCHIVO_ALEMBIC)), "head")
        with obtener_fabrica_sesiones()() as session:
            resumen = cargar_semillas(session, obtener_configuracion().demo_contrasena)
            session.commit()
    return resumen


if __name__ == "__main__":
    print("\n".join(preparar_base()))
