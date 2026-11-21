"""INF-001: semillas de las 6 ligas del MVP y del usuario demo."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import Liga, Usuario
from app.modelos.enums import Cobertura, FuenteDatos, Rol
from app.seguridad.contrasenas import verificar_contrasena
from semillas.__main__ import cargar_semillas
from semillas.ligas import cargar_ligas
from semillas.usuario_demo import EMAIL_DEMO, cargar_usuario_demo

pytestmark = pytest.mark.integracion


def _cantidad(session: Session, modelo) -> int:
    return session.scalar(select(func.count()).select_from(modelo))


def test_inf001_se_cargan_las_6_ligas_del_mvp_en_orden(session: Session):
    cargar_ligas(session)

    ligas = session.scalars(select(Liga).order_by(Liga.orden)).all()
    assert [liga.nombre for liga in ligas] == [
        "Liga Profesional",
        "Primera Nacional",
        "Primera B Metropolitana",
        "Primera C",
        "Primera D",
        "Torneo Federal A",
    ]
    assert all(liga.cobertura == Cobertura.sin_datos for liga in ligas)


def test_dat003_las_ligas_del_ascenso_traen_su_id_de_sportmonks(session: Session):
    cargar_ligas(session)

    ids = {liga.nombre: liga.id_sportmonks for liga in session.scalars(select(Liga))}
    assert ids == {
        "Liga Profesional": None,
        "Primera Nacional": 645,
        "Primera B Metropolitana": 1330,
        "Primera C": 1093,
        "Primera D": 1094,
        "Torneo Federal A": 1333,
    }


def test_dat003_la_fuente_de_cada_liga_sale_de_rn_029(session: Session):
    cargar_ligas(session)

    fuentes = {liga.nombre: liga.fuente for liga in session.scalars(select(Liga))}
    assert fuentes == {
        "Liga Profesional": FuenteDatos.api_football,
        "Primera Nacional": FuenteDatos.sportmonks,
        "Primera B Metropolitana": FuenteDatos.api_football,
        "Primera C": FuenteDatos.api_football,
        "Primera D": FuenteDatos.api_football,
        "Torneo Federal A": FuenteDatos.sportmonks,
    }


def test_inf001_cargar_las_ligas_dos_veces_no_las_duplica(session: Session):
    cargar_ligas(session)
    cargar_ligas(session)

    assert _cantidad(session, Liga) == 6


def test_inf001_recargar_las_ligas_no_pisa_lo_que_mantiene_la_sincronizacion(session: Session):
    liga = cargar_ligas(session)[0]
    liga.temporada_actual = 2027
    liga.cobertura = Cobertura.completa

    cargar_ligas(session)

    assert liga.temporada_actual == 2027
    assert liga.cobertura == Cobertura.completa


def test_inf001_se_carga_el_usuario_demo_con_su_contrasena(session: Session):
    cargar_usuario_demo(session, "una-contrasena-de-demo")

    usuario = session.scalars(select(Usuario).where(Usuario.email == EMAIL_DEMO)).one()
    assert usuario.nombre == "Javier Ledesma"
    assert usuario.rol == Rol.director_tecnico
    assert usuario.club == "Deportivo Norte"
    assert verificar_contrasena("una-contrasena-de-demo", usuario.hash_contrasena)


def test_inf001_cargar_el_usuario_demo_dos_veces_no_lo_duplica(session: Session):
    cargar_usuario_demo(session, "primera-contrasena")
    usuario = cargar_usuario_demo(session, "segunda-contrasena")

    assert _cantidad(session, Usuario) == 1
    assert verificar_contrasena("segunda-contrasena", usuario.hash_contrasena)


def test_inf001_el_usuario_demo_necesita_demo_contrasena(session: Session):
    with pytest.raises(ValueError, match="DEMO_CONTRASENA"):
        cargar_usuario_demo(session, "")


def test_inf001_las_semillas_del_deploy_saltean_el_demo_sin_contrasena(session: Session):
    resumen = cargar_semillas(session, "")

    assert _cantidad(session, Liga) == 6
    assert _cantidad(session, Usuario) == 0
    assert resumen[-1] == "Usuario demo salteado: falta DEMO_CONTRASENA"


def test_inf001_las_semillas_del_deploy_cargan_el_demo_con_contrasena(session: Session):
    cargar_semillas(session, "una-contrasena-de-demo")

    assert _cantidad(session, Liga) == 6
    assert _cantidad(session, Usuario) == 1


def test_inf001_recargar_el_demo_con_la_misma_contrasena_no_cambia_el_hash(session: Session):
    hash_original = cargar_usuario_demo(session, "una-contrasena-de-demo").hash_contrasena

    usuario = cargar_usuario_demo(session, "una-contrasena-de-demo")

    assert usuario.hash_contrasena == hash_original
