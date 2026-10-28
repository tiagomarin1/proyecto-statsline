"""Carga las 6 ligas del MVP. Se corre con `python -m semillas.ligas` y se puede repetir.

Los IDs de API-Football se confirmaron el 28/10/2026 con `GET /leagues?country=Argentina`
(INTEGRACIONES_EXTERNAS.md). Si alguno cambia, se corrige acá y se vuelve a correr: la liga se
busca por nombre, así que se actualiza en lugar de duplicarse.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import obtener_fabrica_sesiones
from app.modelos import Liga

# Supuesto (REGLAS_DE_NEGOCIO.md, "Temporada"): la sincronización la actualiza con la temporada
# actual que informa API-Football. En Argentina coincide con el año calendario.
TEMPORADA_INICIAL = 2026


@dataclass(frozen=True)
class DatosLiga:
    nombre: str
    id_api_football: int
    orden: int


LIGAS_MVP = (
    DatosLiga("Liga Profesional", 128, 1),
    DatosLiga("Primera Nacional", 129, 2),
    DatosLiga("Primera B Metropolitana", 131, 3),
    DatosLiga("Primera C", 132, 4),
    DatosLiga("Primera D", 133, 5),
    DatosLiga("Torneo Federal A", 134, 6),
)


def cargar_ligas(session: Session) -> list[Liga]:
    """Crea las ligas que faltan y corrige el id de API-Football y el orden de las existentes.

    No toca temporada_actual ni cobertura de una liga que ya existe: eso lo mantiene la
    sincronización (DAT-001, RN-020).
    """
    ligas = []
    for datos in LIGAS_MVP:
        liga = session.scalars(select(Liga).where(Liga.nombre == datos.nombre)).one_or_none()
        if liga is None:
            liga = Liga(nombre=datos.nombre, temporada_actual=TEMPORADA_INICIAL)
            session.add(liga)
        liga.id_api_football = datos.id_api_football
        liga.orden = datos.orden
        ligas.append(liga)
    session.flush()
    return ligas


if __name__ == "__main__":
    with obtener_fabrica_sesiones()() as session:
        ligas = cargar_ligas(session)
        session.commit()
    print(f"Ligas cargadas: {len(ligas)}")
