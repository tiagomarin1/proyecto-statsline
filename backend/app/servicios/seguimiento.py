"""Lista de seguimiento de cada usuario (SEG-001, RN-026).

La lista es por usuario (supuesto), sin repetidos, y se ordena del más reciente al más viejo.
Cada fila es la misma que en los resultados de la búsqueda.
"""

from datetime import date

from sqlalchemy.orm import Session, aliased

from app.errores import ErrorApi
from app.esquemas.busqueda import JugadorResumen
from app.esquemas.seguimiento import RespuestaGuardado
from app.modelos import Jugador, Seguimiento
from app.repositorios import jugador as repositorio_jugador
from app.repositorios import seguimiento as repositorio_seguimiento
from app.servicios.busqueda import a_jugador_resumen, consulta_base

# Más que suficiente para una lista personal; se pagina en el frontend si hiciera falta
MAXIMO_JUGADORES_EN_LISTA = 500


def aviso_guardado(nombre: str) -> str:
    """RN-026."""
    return f"{nombre} quedó guardado en la lista de seguimiento."


def aviso_quitado(nombre: str) -> str:
    """RN-026."""
    return f"{nombre} salió de la lista de seguimiento."


def listar(session: Session, usuario_id: int, hoy: date) -> list[JugadorResumen]:
    """Los guardados del usuario, del más reciente al más viejo (RN-026).

    Como en la búsqueda, cada jugador sale con su estadística vigente (RN-017): uno sin
    estadística en la temporada actual de su liga no se muestra.
    """
    # Alias: consulta_base ya usa la tabla seguimiento en el EXISTS de en_seguimiento, y sin alias
    # SQLAlchemy correlacionaría ese EXISTS con este join
    guardado = aliased(Seguimiento)
    consulta = (
        consulta_base(usuario_id)
        .join(guardado, (guardado.jugador_id == Jugador.id) & (guardado.usuario_id == usuario_id))
        .order_by(guardado.creado_en.desc(), Jugador.id.desc())
    )
    filas = repositorio_jugador.listar(session, consulta, MAXIMO_JUGADORES_EN_LISTA, 0)
    return [a_jugador_resumen(fila, hoy) for fila in filas]


def guardar(session: Session, usuario_id: int, jugador_id: int) -> tuple[RespuestaGuardado, bool]:
    """Agrega el jugador (idempotente). Devuelve la respuesta y si se agregó recién."""
    jugador = session.get(Jugador, jugador_id)
    if jugador is None:
        raise ErrorApi(404, "jugador_inexistente", "No encontramos a ese jugador.")
    agregado = repositorio_seguimiento.agregar(session, usuario_id, jugador_id)
    session.commit()
    return RespuestaGuardado(jugador_id=jugador_id, aviso=aviso_guardado(jugador.nombre)), agregado


def quitar(session: Session, usuario_id: int, jugador_id: int) -> None:
    """Saca el jugador de la lista. Si no estaba, no hace nada (idempotente)."""
    repositorio_seguimiento.quitar(session, usuario_id, jugador_id)
    session.commit()
