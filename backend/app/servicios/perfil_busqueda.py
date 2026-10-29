"""Perfil de búsqueda guardado (BUS-005, RN-023): uno por usuario."""

from sqlalchemy.orm import Session

from app.errores import ErrorApi
from app.esquemas.perfil_busqueda import PedidoPerfilBusqueda
from app.modelos import PerfilBusqueda
from app.repositorios import liga as repositorio_liga
from app.repositorios import perfil_busqueda as repositorio_perfil

# RN-023: campo obligatorio → cómo se nombra en el mensaje (los del prototipo)
OBLIGATORIOS = {"posicion": "la posición", "liga_id": "la liga", "edad": "el rango de edad"}
CAMPOS_GUARDABLES = (
    "posicion",
    "liga_id",
    "edad_min",
    "edad_max",
    "presupuesto_max_eur",
    "pases_min",
    "duelos_min",
    "recuperaciones_min",
    "minutos_min",
)


def faltantes(pedido: PedidoPerfilBusqueda) -> list[str]:
    """RN-023: devuelve los obligatorios que faltan. El rango de edad necesita los dos extremos."""
    presentes = {
        "posicion": pedido.posicion is not None,
        "liga_id": pedido.liga_id is not None,
        "edad": pedido.edad_min is not None and pedido.edad_max is not None,
    }
    return [campo for campo in OBLIGATORIOS if not presentes[campo]]


def mensaje_de_faltantes(campos: list[str]) -> str:
    """RN-023: "Para guardar el perfil falta elegir la posición y la liga."."""
    nombres = [OBLIGATORIOS[campo] for campo in campos]
    lista = nombres[0] if len(nombres) == 1 else ", ".join(nombres[:-1]) + " y " + nombres[-1]
    return f"Para guardar el perfil falta elegir {lista}."


def obtener(session: Session, usuario_id: int) -> PerfilBusqueda:
    perfil = repositorio_perfil.obtener_por_usuario(session, usuario_id)
    if perfil is None:
        raise ErrorApi(404, "sin_perfil", "Todavía no guardaste un perfil de búsqueda.")
    return perfil


def guardar(session: Session, usuario_id: int, pedido: PedidoPerfilBusqueda) -> PerfilBusqueda:
    """BUS-005: crea el perfil o reemplaza al anterior (hay uno solo por usuario, RN-023)."""
    faltan = faltantes(pedido)
    if faltan:
        errores = [
            {"campo": campo, "mensaje": f"Falta elegir {OBLIGATORIOS[campo]}."} for campo in faltan
        ]
        raise ErrorApi(422, "validacion", mensaje_de_faltantes(faltan), errores)
    if repositorio_liga.obtener_por_id(session, pedido.liga_id) is None:
        raise ErrorApi(404, "liga_inexistente", "No existe esa liga.")

    # Reemplazar = pisar todos los campos, también los opcionales que ahora vienen vacíos
    valores = {campo: getattr(pedido, campo) for campo in CAMPOS_GUARDABLES}
    perfil = repositorio_perfil.guardar(session, usuario_id, valores)
    session.commit()
    return perfil
