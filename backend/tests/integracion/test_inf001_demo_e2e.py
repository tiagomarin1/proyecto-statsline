"""INF-001: seed fijo para el E2E de la demo (TESTING_STRATEGY.md), con datos reales de los
fixtures de API-Football y de Transfermarkt."""

from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import EstadisticaTemporada, Jugador, Liga, Usuario
from app.modelos.enums import Cobertura
from semillas.demo_e2e import FECHA_VALORES, cargar_demo_e2e
from semillas.usuario_demo import EMAIL_DEMO

pytestmark = pytest.mark.integracion

CONTRASENA = "contrasena-del-seed"


def _liga(session: Session, nombre: str) -> Liga:
    return session.scalars(select(Liga).where(Liga.nombre == nombre)).one()


def _cantidad(session: Session, modelo, *condiciones) -> int:
    return session.scalar(select(func.count()).select_from(modelo).where(*condiciones))


def test_inf001_el_seed_carga_las_ligas_con_su_temporada_y_cobertura(session: Session):
    cargar_demo_e2e(session, CONTRASENA)

    profesional = _liga(session, "Liga Profesional")
    nacional = _liga(session, "Primera Nacional")
    primera_c = _liga(session, "Primera C")
    assert (profesional.temporada_actual, profesional.cobertura) == (2026, Cobertura.completa)
    assert (nacional.temporada_actual, nacional.cobertura) == (2025, Cobertura.basica)
    assert primera_c.cobertura == Cobertura.sin_datos
    assert _cantidad(session, Liga) == 6


def test_inf001_el_seed_carga_jugadores_reales_de_los_fixtures(session: Session):
    cargar_demo_e2e(session, CONTRASENA)

    # 20 de la Liga Profesional y 20 de la Primera Nacional, de las páginas reales grabadas
    assert _cantidad(session, Jugador) == 40
    profesional = _liga(session, "Liga Profesional")
    assert (
        _cantidad(
            session,
            EstadisticaTemporada,
            EstadisticaTemporada.liga_id == profesional.id,
            EstadisticaTemporada.temporada == 2026,
        )
        == 21
    )


def test_inf001_el_seed_carga_valores_de_mercado_de_la_muestra(session: Session):
    cargar_demo_e2e(session, CONTRASENA)

    colidio = session.scalars(select(Jugador).where(Jugador.id_api_football == 214)).one()
    assert colidio.valor_mercado_eur == 5_000_000
    assert colidio.valor_mercado_fecha == FECHA_VALORES
    # Para el filtro de presupuesto hace falta que haya jugadores con y sin valor
    assert _cantidad(session, Jugador, Jugador.valor_mercado_eur.is_not(None)) >= 4
    assert _cantidad(session, Jugador, Jugador.valor_mercado_eur.is_(None)) > 0


def test_inf001_el_seed_crea_el_usuario_demo(session: Session):
    cargar_demo_e2e(session, CONTRASENA)

    assert session.scalars(select(Usuario).where(Usuario.email == EMAIL_DEMO)).one()


def test_inf001_el_seed_se_puede_correr_dos_veces_sin_duplicar(session: Session):
    cargar_demo_e2e(session, CONTRASENA)
    cargar_demo_e2e(session, CONTRASENA)

    assert _cantidad(session, Jugador) == 40
    assert _cantidad(session, Usuario) == 1
    assert _cantidad(session, Liga) == 6


def test_inf001_el_seed_devuelve_un_resumen(session: Session):
    resumen = cargar_demo_e2e(session, CONTRASENA)

    assert any("Liga Profesional" in linea and "2026" in linea for linea in resumen)
    assert any(EMAIL_DEMO in linea for linea in resumen)


def test_inf001_la_fecha_de_los_valores_es_la_del_dataset():
    assert date(2026, 7, 6) == FECHA_VALORES
