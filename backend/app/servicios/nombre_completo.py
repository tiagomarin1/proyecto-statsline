"""Nombre completo del jugador (JUG-004, RN-038).

`nombre` es el nombre para mostrar de la fuente y suele venir abreviado ("L. Di Lollo"). La
interfaz muestra en todos lados el nombre de pila y el apellido.
"""


def _limpiar(texto: str | None) -> str:
    """Sin espacios en los bordes ni dobles. None o solo espacios queda vacío."""
    return " ".join((texto or "").split())


def nombre_completo(nombre: str, nombre_pila: str | None, apellido: str | None) -> str:
    """RN-038: nombre de pila + apellido si hay ambos; si falta uno, el que haya; si faltan los
    dos, el `nombre` de la fuente. Las tildes y mayúsculas quedan como vienen."""
    partes = [parte for parte in (_limpiar(nombre_pila), _limpiar(apellido)) if parte]
    return " ".join(partes) if partes else _limpiar(nombre)
