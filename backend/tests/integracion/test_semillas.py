"""INF-001: semillas de las 6 ligas del MVP y del usuario demo."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modelos import Liga, Usuario
from app.modelos.enums import Cobertura, Rol
from app.seguridad.contrasenas import verificar_contrasena
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
