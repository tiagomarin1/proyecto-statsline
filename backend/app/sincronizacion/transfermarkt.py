"""Importación del valor de mercado desde transfermarkt-datasets (DAT-002, ADR-0004). Se corre con:

    python -m app.sincronizacion.transfermarkt --archivo <ruta a players.csv o players.csv.gz>

Cruza cada jugador con el CSV (RN-002) y escribe todo en una sola transacción: si algo falla,
no se modifica ningún valor y la corrida queda registrada con estado "error" (RN-025). Al
terminar, imprime por liga cuántos jugadores quedaron con valor, sin coincidencia y ambiguos.
"""

import argparse
import logging
import sys
from collections import Counter
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import obtener_fabrica_sesiones
from app.integraciones.lector_transfermarkt import leer_jugadores_transfermarkt
from app.modelos import Sincronizacion
from app.modelos.base import ahora_utc
from app.modelos.enums import EstadoSincronizacion, OrigenSincronizacion
from app.repositorios import valor_mercado as repositorio
from app.servicios.valor_mercado import Cruce, ResultadoCruce, cruzar_jugadores

logger = logging.getLogger(__name__)

# El CSV no trae la fecha de cada valor: se usa la del corte del dataset (INTEGRACIONES_EXTERNAS.md)
FECHA_DATASET = date(2026, 7, 6)
SIN_LIGA = "Sin liga"
CATEGORIAS_RESUMEN = ("con_valor", "cruzado_sin_valor", "sin_coincidencia", "ambiguo", "sin_fecha")
LARGO_MAXIMO_MENSAJE_ERROR = 2000

Resumen = dict[str, dict[str, int]]


def importar(
    session: Session, archivo: Path, fecha: date = FECHA_DATASET
) -> tuple[Sincronizacion, Resumen]:
    """Importa el valor de mercado. Devuelve la corrida registrada y el resumen por liga."""
    sincronizacion = Sincronizacion(origen=OrigenSincronizacion.transfermarkt)
    session.add(sincronizacion)
    # La corrida queda registrada aunque después se deshaga la importación
    session.commit()
    sincronizacion_id = sincronizacion.id
    resumen: Resumen = {}
    try:
        filas = leer_jugadores_transfermarkt(archivo)
        cruces = cruzar_jugadores(repositorio.listar_jugadores_para_cruce(session), filas)
        sincronizacion.registros_actualizados = repositorio.guardar_valores(session, cruces, fecha)
        resumen = resumir_por_liga(cruces, repositorio.ligas_por_jugador(session))
        sincronizacion.estado = EstadoSincronizacion.ok
    except Exception as error:
        session.rollback()
        sincronizacion = session.get(Sincronizacion, sincronizacion_id)
        sincronizacion.estado = EstadoSincronizacion.error
        sincronizacion.mensaje_error = f"{type(error).__name__}: {error}"[
            :LARGO_MAXIMO_MENSAJE_ERROR
        ]
        logger.error("Falló la importación de Transfermarkt: %s", error)
    sincronizacion.finalizada_en = ahora_utc()
    session.commit()
    return sincronizacion, resumen


def resumir_por_liga(cruces: dict[int, Cruce], ligas: dict[int, list[str]]) -> Resumen:
    """Cuenta, por liga, el resultado del cruce. Un jugador en dos ligas cuenta en las dos."""
    contadores: dict[str, Counter] = {}
    for jugador_id, cruce in cruces.items():
        for liga in ligas.get(jugador_id) or [SIN_LIGA]:
            contadores.setdefault(liga, Counter())[_categoria(cruce)] += 1
    return {
        liga: {categoria: contador[categoria] for categoria in CATEGORIAS_RESUMEN}
        for liga, contador in contadores.items()
    }


def main(argumentos: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Importa el valor de mercado de Transfermarkt.")
    parser.add_argument("--archivo", type=Path, required=True, help="players.csv o .csv.gz")
    parser.add_argument(
        "--fecha",
        type=date.fromisoformat,
        default=FECHA_DATASET,
        help=f"fecha de corte del dataset, AAAA-MM-DD (por defecto {FECHA_DATASET})",
    )
    opciones = parser.parse_args(argumentos)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    with obtener_fabrica_sesiones()() as session:
        sincronizacion, resumen = importar(session, opciones.archivo, opciones.fecha)
    for liga, contador in sorted(resumen.items()):
        detalle = ", ".join(f"{contador[c]} {c.replace('_', ' ')}" for c in CATEGORIAS_RESUMEN)
        print(f"{liga}: {detalle}")
    print(f"Jugadores cruzados: {sincronizacion.registros_actualizados}")
    return 0 if sincronizacion.estado == EstadoSincronizacion.ok else 1


def _categoria(cruce: Cruce) -> str:
    if cruce.resultado != ResultadoCruce.cruzado:
        return cruce.resultado.value
    return "con_valor" if cruce.fila.valor_mercado_eur is not None else "cruzado_sin_valor"


if __name__ == "__main__":
    sys.exit(main())
