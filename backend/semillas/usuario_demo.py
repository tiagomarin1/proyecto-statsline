"""Crea el usuario de la demo (Javier Ledesma). Se corre con `python -m semillas.usuario_demo`.

La contraseña sale de la variable de entorno DEMO_CONTRASENA y nunca se guarda en el repo.
Se puede repetir: si el usuario ya existe, se actualizan sus datos. La contraseña se vuelve a
hashear solo si DEMO_CONTRASENA cambió, así que cada arranque del contenedor no la pisa.
"""

import sys

from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_fabrica_sesiones
from app.modelos import Usuario
from app.modelos.base import ahora_utc
from app.modelos.enums import Rol
from app.repositorios import usuario as repositorio_usuario
from app.seguridad.contrasenas import hashear_contrasena, verificar_contrasena

NOMBRE_DEMO = "Javier Ledesma"
EMAIL_DEMO = "javier@deportivonorte.com"
CLUB_DEMO = "Deportivo Norte"


def cargar_usuario_demo(session: Session, contrasena: str) -> Usuario:
    if not contrasena:
        raise ValueError("Falta DEMO_CONTRASENA: definila en el .env antes de cargar el demo.")
    usuario = repositorio_usuario.obtener_por_email(session, EMAIL_DEMO)
    if usuario is None:
        usuario = Usuario(email=EMAIL_DEMO, terminos_aceptados_en=ahora_utc())
        session.add(usuario)
    usuario.nombre = NOMBRE_DEMO
    usuario.rol = Rol.director_tecnico
    usuario.club = CLUB_DEMO
    if usuario.hash_contrasena is None or not verificar_contrasena(
        contrasena, usuario.hash_contrasena
    ):
        usuario.hash_contrasena = hashear_contrasena(contrasena)
    session.flush()
    return usuario


if __name__ == "__main__":
    try:
        with obtener_fabrica_sesiones()() as session:
            cargar_usuario_demo(session, obtener_configuracion().demo_contrasena)
            session.commit()
    except ValueError as error:
        sys.exit(str(error))
    print(f"Usuario demo listo: {EMAIL_DEMO}")
