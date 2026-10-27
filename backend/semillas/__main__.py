"""Corre todas las semillas: `python -m semillas`. Railway lo corre antes de cada deploy.

La del usuario demo se saltea si no hay DEMO_CONTRASENA, para no frenar el deploy.
"""

from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_fabrica_sesiones
from semillas.ligas import cargar_ligas
from semillas.usuario_demo import EMAIL_DEMO, cargar_usuario_demo


def cargar_semillas(session: Session, demo_contrasena: str) -> list[str]:
    """Carga las ligas y, si hay contraseña, el usuario demo. Devuelve un resumen por línea."""
    resumen = [f"Ligas cargadas: {len(cargar_ligas(session))}"]
    if demo_contrasena:
        cargar_usuario_demo(session, demo_contrasena)
        resumen.append(f"Usuario demo listo: {EMAIL_DEMO}")
    else:
        resumen.append("Usuario demo salteado: falta DEMO_CONTRASENA")
    return resumen


if __name__ == "__main__":
    with obtener_fabrica_sesiones()() as session:
        resumen = cargar_semillas(session, obtener_configuracion().demo_contrasena)
        session.commit()
    print("\n".join(resumen))
