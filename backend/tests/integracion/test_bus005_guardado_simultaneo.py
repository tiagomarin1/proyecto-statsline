"""BUS-005: dos guardados simultáneos del primer perfil no fallan (RN-023: uno por usuario).

La carrera solo existe entre transacciones distintas, así que este test usa sus propias
conexiones y confirma datos. Al terminar borra lo que creó.
"""

import threading
import time

import pytest
from sqlalchemy import Engine, delete, func, select, text
from sqlalchemy.orm import Session

from app.esquemas.perfil_busqueda import PedidoPerfilBusqueda
from app.modelos import Liga, PerfilBusqueda, Usuario
from app.modelos.enums import Posicion
from app.servicios import perfil_busqueda as servicio_perfil
from tests.fabricas import crear_liga, crear_usuario

pytestmark = pytest.mark.integracion

SEGUNDOS_MAXIMOS_DE_ESPERA = 5
INTERVALO_DE_CONSULTA_SEGUNDOS = 0.05


@pytest.fixture
def usuario_y_liga(engine_test: Engine):
    with Session(engine_test) as session:
        usuario, liga = crear_usuario(session), crear_liga(session)
        session.commit()
        ids = usuario.id, liga.id
    yield ids
    usuario_id, liga_id = ids
    with Session(engine_test) as session:
        session.execute(delete(PerfilBusqueda).where(PerfilBusqueda.usuario_id == usuario_id))
        session.execute(delete(Usuario).where(Usuario.id == usuario_id))
        session.execute(delete(Liga).where(Liga.id == liga_id))
        session.commit()


def _esperar_que_quede_bloqueada(engine: Engine, pid: int) -> None:
    """Espera a que la conexión `pid` esté frenada por un bloqueo de otra transacción."""
    limite = time.monotonic() + SEGUNDOS_MAXIMOS_DE_ESPERA
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conexion:
        while time.monotonic() < limite:
            bloqueada = conexion.execute(
                text("SELECT wait_event_type = 'Lock' FROM pg_stat_activity WHERE pid = :pid"),
                {"pid": pid},
            ).scalar()
            if bloqueada:
                return
            time.sleep(INTERVALO_DE_CONSULTA_SEGUNDOS)
    pytest.fail("El segundo guardado nunca quedó esperando al primero.")


def test_bus005_dos_guardados_simultaneos_del_primer_perfil_no_fallan(
    engine_test: Engine, usuario_y_liga
):
    usuario_id, liga_id = usuario_y_liga
    errores: list[Exception] = []

    with Session(engine_test) as primera, Session(engine_test) as segunda:
        # La primera ya insertó el perfil pero todavía no confirmó
        primera.add(
            PerfilBusqueda(
                usuario_id=usuario_id,
                posicion=Posicion.defensor,
                liga_id=liga_id,
                edad_min=20,
                edad_max=27,
            )
        )
        primera.flush()
        pid_segunda = segunda.execute(text("SELECT pg_backend_pid()")).scalar()

        def guardar_segunda() -> None:
            pedido = PedidoPerfilBusqueda(
                posicion=Posicion.delantero, liga_id=liga_id, edad_min=18, edad_max=30
            )
            try:
                servicio_perfil.guardar(segunda, usuario_id, pedido)
            except Exception as error:
                errores.append(error)

        hilo = threading.Thread(target=guardar_segunda)
        hilo.start()
        try:
            _esperar_que_quede_bloqueada(engine_test, pid_segunda)
        finally:
            primera.commit()
            hilo.join(SEGUNDOS_MAXIMOS_DE_ESPERA)

    assert errores == []
    with Session(engine_test) as session:
        perfiles = session.scalars(
            select(PerfilBusqueda).where(PerfilBusqueda.usuario_id == usuario_id)
        ).all()
        assert [(p.posicion, p.edad_min, p.edad_max) for p in perfiles] == [
            (Posicion.delantero, 18, 30)
        ]
        assert session.scalar(select(func.count()).select_from(PerfilBusqueda)) == 1
