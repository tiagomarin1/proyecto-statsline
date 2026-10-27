"""Guarda para los tests de integración, que borran y recrean la base de test."""

SUFIJO_BASE_DE_TEST = "_test"


def validar_nombre_base_de_test(nombre: str | None) -> str:
    """Devuelve el nombre si termina en _test; si no, lanza ValueError y no se borra nada."""
    if not nombre or not nombre.endswith(SUFIJO_BASE_DE_TEST):
        raise ValueError(
            f"DATABASE_URL_TEST apunta a '{nombre}'. Los tests borran esa base, así que su nombre "
            f"tiene que terminar en '{SUFIJO_BASE_DE_TEST}' (por ejemplo statsline_test)."
        )
    return nombre
