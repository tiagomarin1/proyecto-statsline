"""Seed fijo para el E2E de la demo (TESTING_STRATEGY.md) y para desarrollar el frontend sin
API-Football ni Aiven. Se corre desde el repo con `python -m semillas.demo_e2e` y necesita
DEMO_CONTRASENA.

Carga datos reales, sin llamar a ninguna API:
- las 6 ligas y el usuario demo;
- los jugadores de las páginas grabadas en tests/fixtures/api_football/: Liga Profesional 2026
  (cobertura completa) y Primera Nacional 2025 (básica, RN-027);
- los valores de mercado de tests/fixtures/transfermarkt/players_muestra.csv (RN-002).

Solo corre contra una base local: recalcula el valor de mercado de todos los jugadores.
"""

import json
import sys
from pathlib import Path

from sqlalchemy import make_url
from sqlalchemy.orm import Session

from app.config import obtener_configuracion
from app.db import obtener_fabrica_sesiones
from app.integraciones.lector_transfermarkt import leer_jugadores_transfermarkt
from app.repositorios import sincronizacion_api_football as repositorio_sincronizacion
from app.repositorios import valor_mercado as repositorio_valor_mercado
from app.servicios.cobertura import calcular_cobertura
from app.servicios.valor_mercado import cruzar_jugadores
from app.sincronizacion.mapeo import mapear_jugadores
from app.sincronizacion.transfermarkt import FECHA_DATASET
from semillas.ligas import cargar_ligas
from semillas.usuario_demo import EMAIL_DEMO, cargar_usuario_demo

DIRECTORIO_FIXTURES = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
FECHA_VALORES = FECHA_DATASET
# (id de API-Football, temporada, página grabada). Primera Nacional va en 2025 por RN-027
PAGINAS_DE_LA_DEMO = (
    (128, 2026, "players_liga_completa_128_2026_p1"),
    (129, 2025, "players_liga_basica_129_2025_p1"),
)
MUESTRA_TRANSFERMARKT = DIRECTORIO_FIXTURES / "transfermarkt" / "players_muestra.csv"
HOSTS_LOCALES = {"localhost", "127.0.0.1", "::1", "postgres"}


class ErrorBaseNoLocal(Exception):
    """El seed se pidió contra una base que no es local, o en producción."""


def verificar_base_local(url: str, entorno: str) -> None:
    """El seed pisa los valores de mercado: solo corre contra localhost o el contenedor de
    docker compose, y nunca con ENTORNO=produccion."""
    if entorno == "produccion":
        raise ErrorBaseNoLocal("El seed de la demo no corre en producción.")
    host = make_url(url).host
    if host not in HOSTS_LOCALES:
        raise ErrorBaseNoLocal(
            f"El seed de la demo solo corre contra una base local, y DATABASE_URL apunta a {host}."
        )


def cargar_demo_e2e(session: Session, demo_contrasena: str) -> list[str]:
    """Carga el seed (se puede repetir: todo es upsert). Devuelve un resumen por línea."""
    ligas = {liga.id_api_football: liga for liga in cargar_ligas(session)}
    resumen = []
    for id_api_football, temporada, fixture in PAGINAS_DE_LA_DEMO:
        liga = ligas[id_api_football]
        respuesta = json.loads(
            (DIRECTORIO_FIXTURES / "api_football" / f"{fixture}.json").read_text(encoding="utf-8")
        )["response"]
        datos = mapear_jugadores(respuesta, id_api_football)
        registros = repositorio_sincronizacion.guardar_datos_de_liga(
            session, datos, liga.id, temporada
        )
        liga.temporada_actual = temporada
        liga.cobertura = calcular_cobertura(
            *repositorio_sincronizacion.contar_para_cobertura(session, liga.id, temporada)
        )
        resumen.append(f"{liga.nombre} {temporada}: {registros} registros, {liga.cobertura}")

    cargar_usuario_demo(session, demo_contrasena)
    resumen.append(f"Usuario demo listo: {EMAIL_DEMO}")

    cruces = cruzar_jugadores(
        repositorio_valor_mercado.listar_jugadores_para_cruce(session),
        leer_jugadores_transfermarkt(MUESTRA_TRANSFERMARKT),
    )
    con_valor = repositorio_valor_mercado.guardar_valores(session, cruces, FECHA_VALORES)
    resumen.append(f"Jugadores con valor de mercado: {con_valor}")
    session.flush()
    return resumen


if __name__ == "__main__":
    configuracion = obtener_configuracion()
    try:
        verificar_base_local(configuracion.database_url, configuracion.entorno)
        with obtener_fabrica_sesiones()() as session:
            resumen = cargar_demo_e2e(session, configuracion.demo_contrasena)
            session.commit()
    except (ErrorBaseNoLocal, ValueError) as error:
        sys.exit(str(error))
    print("\n".join(resumen))
