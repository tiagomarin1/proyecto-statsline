"""Búsqueda de jugadores por nombre (BUS-010, RN-035, propuesta).

El texto se normaliza como en RN-002 y se separa en palabras. Un jugador coincide si cada palabra
del texto es el comienzo de alguna palabra de su nombre, sin importar el orden. El nombre junta
`nombre`, `nombre_pila` y `apellido`, porque API-Football trae el nombre para mostrar abreviado
("S. Arias").

La regla está dos veces en este archivo y en ningún otro lado: en Python (`coincide_con_nombre`,
la referencia) y como expresión de SQL (`filtrar_por_nombre`), porque la búsqueda filtra y pagina
en la base (ENGINEERING_STANDARDS.md §3). Los tests de integración verifican que dan lo mismo.
"""

from sqlalchemy import ColumnElement, Select, func, literal_column

from app.modelos import Jugador
from app.servicios.valor_mercado import normalizar_nombre

# Marcas que quedan sueltas al descomponer una letra con tilde, diéresis o virgulilla (NFKD)
MARCAS_DIACRITICAS = r"[̀-ͯ]"
NO_ALFANUMERICO = "[^a-z0-9]+"


def palabras_de_busqueda(texto: str | None) -> list[str]:
    """RN-035: las palabras del texto ya normalizado, sin repetir. Sin letras ni números no hay
    ninguna, y eso equivale a "sin filtro" (RN-024)."""
    return list(dict.fromkeys(normalizar_nombre(texto).split()))


def coincide_con_nombre(
    texto: str | None, nombre: str, nombre_pila: str | None, apellido: str | None
) -> bool:
    """RN-035: cada palabra del texto es el comienzo de alguna palabra del nombre del jugador.
    Si falta el nombre de pila o el apellido, se compara con lo que haya."""
    del_jugador = normalizar_nombre(f"{nombre} {nombre_pila or ''} {apellido or ''}").split()
    return all(
        any(palabra.startswith(buscada) for palabra in del_jugador)
        for buscada in palabras_de_busqueda(texto)
    )


def normalizar_nombre_sql(texto: ColumnElement[str]) -> ColumnElement[str]:
    """La normalización de RN-002 (`normalizar_nombre`) como expresión de PostgreSQL."""
    descompuesto = func.normalize(texto, literal_column("NFKD"))
    sin_tildes = func.lower(func.regexp_replace(descompuesto, MARCAS_DIACRITICAS, "", "g"))
    return func.btrim(func.regexp_replace(sin_tildes, NO_ALFANUMERICO, " ", "g"))


def filtrar_por_nombre(consulta: Select, nombre: str | None) -> Select:
    """RN-035 en SQL. Con un espacio adelante, cada palabra del nombre queda precedida por un
    espacio: "% ari%" encuentra las palabras que empiezan con "ari" y no las que lo tienen en
    el medio. Las palabras buscadas solo tienen letras y números: no hay comodines que escapar.
    """
    palabras = palabras_de_busqueda(nombre)
    if not palabras:
        return consulta
    # concat_ws saltea los nulos: sin nombre de pila ni apellido se compara solo con `nombre`
    del_jugador = func.concat(
        " ",
        normalizar_nombre_sql(
            func.concat_ws(" ", Jugador.nombre, Jugador.nombre_pila, Jugador.apellido)
        ),
    )
    for palabra in palabras:
        consulta = consulta.where(del_jugador.like(f"% {palabra}%"))
    return consulta
