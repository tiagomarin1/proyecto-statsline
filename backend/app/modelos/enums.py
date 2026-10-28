"""Enums del modelo canónico. El valor es el que se guarda en MySQL y viaja en el JSON."""

from enum import StrEnum


class Posicion(StrEnum):
    """RN-019: las 4 posiciones de API-Football."""

    arquero = "arquero"
    defensor = "defensor"
    mediocampista = "mediocampista"
    delantero = "delantero"


class Rol(StrEnum):
    director_tecnico = "director_tecnico"
    director_deportivo = "director_deportivo"
    dirigente = "dirigente"
    ojeador = "ojeador"


class Cobertura(StrEnum):
    """RN-020."""

    completa = "completa"
    basica = "basica"
    sin_datos = "sin_datos"


class OrigenSincronizacion(StrEnum):
    api_football = "api_football"
    transfermarkt = "transfermarkt"


class EstadoSincronizacion(StrEnum):
    en_curso = "en_curso"
    ok = "ok"
    error = "error"
