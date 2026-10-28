"""Lector de players.csv de transfermarkt-datasets (ADR-0004, INTEGRACIONES_EXTERNAS.md).

Acepta el CSV tal cual o comprimido (.csv.gz, como lo publica el dataset). Solo devuelve las
columnas que usa el cruce de RN-002. Un dato vacío o que no se entiende queda en None.
"""

import csv
import gzip
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import TextIO

COLUMNAS_NECESARIAS = ("player_id", "name", "date_of_birth", "market_value_in_eur")
# date_of_birth viene como "AAAA-MM-DD 00:00:00"
LARGO_FECHA = 10


class ErrorArchivoTransfermarkt(Exception):
    """El archivo no existe o no tiene el formato de players.csv."""


@dataclass(frozen=True)
class FilaTransfermarkt:
    id_transfermarkt: int
    nombre: str
    fecha_nacimiento: date | None
    valor_mercado_eur: int | None


def leer_jugadores_transfermarkt(ruta: Path) -> list[FilaTransfermarkt]:
    if not ruta.is_file():
        raise ErrorArchivoTransfermarkt(f"No existe el archivo {ruta}.")
    with _abrir(ruta) as archivo:
        lector = csv.DictReader(archivo)
        faltantes = [c for c in COLUMNAS_NECESARIAS if c not in (lector.fieldnames or [])]
        if faltantes:
            raise ErrorArchivoTransfermarkt(
                f"{ruta.name} no tiene las columnas {', '.join(faltantes)} de players.csv."
            )
        filas = (_leer_fila(fila) for fila in lector)
        return [fila for fila in filas if fila is not None]


def _abrir(ruta: Path) -> TextIO:
    if ruta.suffix == ".gz":
        return gzip.open(ruta, "rt", encoding="utf-8", newline="")
    return ruta.open(encoding="utf-8", newline="")


def _leer_fila(fila: dict[str, str]) -> FilaTransfermarkt | None:
    id_transfermarkt = _entero(fila["player_id"])
    nombre = (fila["name"] or "").strip()
    if id_transfermarkt is None or not nombre:
        return None
    return FilaTransfermarkt(
        id_transfermarkt=id_transfermarkt,
        nombre=nombre,
        fecha_nacimiento=_fecha(fila["date_of_birth"]),
        valor_mercado_eur=_entero(fila["market_value_in_eur"]),
    )


def _entero(valor: str | None) -> int | None:
    try:
        numero = int(float(valor)) if valor else None
    except ValueError:
        return None
    return numero if numero is not None and numero >= 0 else None


def _fecha(valor: str | None) -> date | None:
    try:
        return date.fromisoformat((valor or "")[:LARGO_FECHA])
    except ValueError:
        return None
