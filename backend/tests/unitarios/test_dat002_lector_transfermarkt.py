"""DAT-002: lectura de players.csv de transfermarkt-datasets, con la fixture real."""

import gzip
import shutil
from datetime import date
from pathlib import Path

import pytest

from app.integraciones.lector_transfermarkt import (
    ErrorArchivoTransfermarkt,
    leer_jugadores_transfermarkt,
)

MUESTRA = Path(__file__).parents[1] / "fixtures" / "transfermarkt" / "players_muestra.csv"


def _por_id(filas):
    return {fila.id_transfermarkt: fila for fila in filas}


def test_dat002_lee_las_columnas_que_usa_el_cruce():
    filas = _por_id(leer_jugadores_transfermarkt(MUESTRA))

    assert len(filas) == 7
    colidio = filas[491705]
    assert colidio.nombre == "Facundo Colidio"
    assert colidio.fecha_nacimiento == date(2000, 1, 4)
    assert colidio.valor_mercado_eur == 5_000_000


def test_dat002_un_valor_vacio_queda_none():
    castro = _por_id(leer_jugadores_transfermarkt(MUESTRA))[441160]

    assert castro.valor_mercado_eur is None


def test_dat002_lee_el_csv_comprimido_como_lo_publica_el_dataset(tmp_path: Path):
    comprimido = tmp_path / "players.csv.gz"
    with MUESTRA.open("rb") as origen, gzip.open(comprimido, "wb") as destino:
        shutil.copyfileobj(origen, destino)

    assert len(leer_jugadores_transfermarkt(comprimido)) == 7


def test_dat002_una_fecha_que_no_se_entiende_queda_none(tmp_path: Path):
    archivo = tmp_path / "players.csv"
    archivo.write_text(
        "player_id,name,date_of_birth,market_value_in_eur\n10,Juan Perez,sin fecha,120000\n",
        encoding="utf-8",
    )

    [fila] = leer_jugadores_transfermarkt(archivo)
    assert fila.fecha_nacimiento is None
    assert fila.valor_mercado_eur == 120_000


def test_dat002_un_archivo_sin_las_columnas_esperadas_es_error(tmp_path: Path):
    archivo = tmp_path / "players.csv"
    archivo.write_text("id,nombre\n1,Juan\n", encoding="utf-8")

    with pytest.raises(ErrorArchivoTransfermarkt, match="market_value_in_eur"):
        leer_jugadores_transfermarkt(archivo)


def test_dat002_un_archivo_que_no_existe_es_error(tmp_path: Path):
    with pytest.raises(ErrorArchivoTransfermarkt, match="No existe"):
        leer_jugadores_transfermarkt(tmp_path / "no_existe.csv")
