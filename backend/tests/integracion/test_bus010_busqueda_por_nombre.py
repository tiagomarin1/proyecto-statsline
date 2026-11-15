"""BUS-010: GET /api/v1/jugadores?nombre= (RN-035) y su combinación con los demás filtros
(RN-005, RN-008, RN-016 y RN-021)."""

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modelos.enums import Posicion
from app.servicios.busqueda_por_nombre import coincide_con_nombre
from app.servicios.edad import obtener_hoy
from tests.ejemplo_rn035 import (
    CASOS_RN035,
    JUGADORES_RN035,
    NOMBRES_DIFICILES,
    TEXTOS_DIFICILES,
)
from tests.fabricas import crear_estadistica, crear_jugador, crear_liga

pytestmark = pytest.mark.integracion

URL = "/api/v1/jugadores"
ARIAS = ("S. Arias", "Santiago", "Arias Naranjo")
CORREA = ("Á. Correa", "Ángel Martín", "Correa Martínez")
DI_MARIA = ("Á. Di María", "Ángel Fabián", "Di María Hernández")
MAGALLAN = ("L. Magallán", "Lisandro", "Magallán")


@pytest.fixture(autouse=True)
def hoy_fijo(app_test: FastAPI):
    app_test.dependency_overrides[obtener_hoy] = lambda: date(2026, 10, 27)


@pytest.fixture
def liga(session: Session):
    return crear_liga(session)


def _nombres(respuesta) -> list[str]:
    assert respuesta.status_code == 200, respuesta.text
    return [jugador["nombre"] for jugador in respuesta.json()["resultados"]]


def _jugador(session: Session, datos: tuple, *, valor: int | None = None, **estadistica):
    nombre, nombre_pila, apellido = datos
    jugador = crear_jugador(
        session,
        nombre=nombre,
        nombre_pila=nombre_pila,
        apellido=apellido,
        valor_mercado_eur=valor,
    )
    return crear_estadistica(session, jugador=jugador, **estadistica)


def _buscar(cliente: TestClient, **params):
    return cliente.get(URL, params={"tamano": 50, **params})


def test_bus010_apellido_sin_tildes_ni_mayusculas(cliente_con_sesion, session, liga):
    _jugador(session, MAGALLAN, liga=liga)
    _jugador(session, ARIAS, liga=liga)

    assert _nombres(_buscar(cliente_con_sesion, nombre="MAGALLAN")) == ["L. Magallán"]


def test_bus010_nombre_abreviado_como_se_ve_en_la_lista(cliente_con_sesion, session, liga):
    _jugador(session, ARIAS, liga=liga)
    _jugador(session, CORREA, liga=liga)

    assert _nombres(_buscar(cliente_con_sesion, nombre="S. Arias")) == ["S. Arias"]


def test_bus010_nombre_de_pila_y_apellido_completos(cliente_con_sesion, session, liga):
    _jugador(session, ARIAS, liga=liga)
    _jugador(session, CORREA, liga=liga)

    assert _nombres(_buscar(cliente_con_sesion, nombre="santiago arias")) == ["S. Arias"]


def test_bus010_el_orden_de_las_palabras_no_importa(cliente_con_sesion, session, liga):
    _jugador(session, DI_MARIA, liga=liga)
    _jugador(session, CORREA, liga=liga)

    assert _nombres(_buscar(cliente_con_sesion, nombre="maría ángel")) == ["Á. Di María"]


def test_bus010_coincide_desde_el_comienzo_de_la_palabra_y_no_en_el_medio(
    cliente_con_sesion, session, liga
):
    _jugador(session, ARIAS, liga=liga)
    _jugador(session, MAGALLAN, liga=liga)

    assert _nombres(_buscar(cliente_con_sesion, nombre="ari")) == ["S. Arias"]
    assert _nombres(_buscar(cliente_con_sesion, nombre="rias")) == []


def test_bus010_se_combina_con_los_demas_filtros(cliente_con_sesion, session, liga):
    _jugador(session, ("S. Arias", "Santiago", "Arias"), liga=liga, posicion=Posicion.defensor)
    _jugador(session, ("R. Arias", "Ramiro", "Arias"), liga=liga, posicion=Posicion.delantero)
    _jugador(session, CORREA, liga=liga, posicion=Posicion.defensor)

    respuesta = _buscar(cliente_con_sesion, nombre="arias", posicion="defensor", liga_id=liga.id)

    assert _nombres(respuesta) == ["S. Arias"]


def test_bus010_no_cambia_el_orden_ni_el_paginado(cliente_con_sesion, session, liga):
    _jugador(session, ("A. Arias", "Ariel", "Arias"), liga=liga, minutos_jugados=900)
    _jugador(session, ("B. Arias", "Bruno", "Arias"), liga=liga, minutos_jugados=2400)
    _jugador(session, ("C. Arias", "Carlos", "Arias"), liga=liga, minutos_jugados=1500)
    _jugador(session, CORREA, liga=liga, minutos_jugados=3000)

    respuesta = cliente_con_sesion.get(URL, params={"nombre": "arias", "tamano": 2})

    assert _nombres(respuesta) == ["B. Arias", "C. Arias"]
    assert respuesta.json()["total"] == 3
    assert respuesta.json()["pagina"] == 1
    segunda = cliente_con_sesion.get(URL, params={"nombre": "arias", "tamano": 2, "pagina": 2})
    assert _nombres(segunda) == ["A. Arias"]


@pytest.mark.parametrize("texto", ["...", "   ", "", "¿?"])
def test_bus010_texto_sin_letras_ni_numeros_equivale_a_sin_filtro(
    cliente_con_sesion, session, liga, texto: str
):
    _jugador(session, ARIAS, liga=liga)
    _jugador(session, CORREA, liga=liga)

    assert sorted(_nombres(_buscar(cliente_con_sesion, nombre=texto))) == ["S. Arias", "Á. Correa"]


def test_bus010_nombre_de_mas_de_60_caracteres_responde_422(cliente_con_sesion):
    respuesta = cliente_con_sesion.get(URL, params={"nombre": "a" * 61})

    assert respuesta.status_code == 422
    assert respuesta.json()["codigo"] == "validacion"
    assert respuesta.json()["errores"] == [
        {"campo": "nombre", "mensaje": "Puede tener hasta 60 caracteres."}
    ]


def test_bus010_jugador_sin_nombre_de_pila_ni_apellido(cliente_con_sesion, session, liga):
    _jugador(session, ("J. Sosa", None, None), liga=liga)
    _jugador(session, ARIAS, liga=liga)

    assert _nombres(_buscar(cliente_con_sesion, nombre="sosa")) == ["J. Sosa"]


def test_bus010_sin_coincidencias_devuelve_lista_vacia_sin_sugerencia(
    cliente_con_sesion, session, liga
):
    _jugador(session, ARIAS, liga=liga)

    respuesta = _buscar(cliente_con_sesion, nombre="zzzz", posicion="defensor")

    assert respuesta.status_code == 200
    assert respuesta.json()["resultados"] == []
    assert respuesta.json()["total"] == 0
    assert respuesta.json()["sugerencia"] is None


def test_bus010_la_sugerencia_se_calcula_manteniendo_el_nombre(cliente_con_sesion, session, liga):
    _jugador(session, ARIAS, liga=liga, posicion=Posicion.delantero)
    _jugador(session, CORREA, liga=liga, posicion=Posicion.delantero)

    respuesta = _buscar(cliente_con_sesion, nombre="arias", posicion="arquero")

    assert respuesta.json()["total"] == 0
    # Sin la posición aparece 1 (S. Arias), no 2: el nombre no se relaja (RN-016, RN-035)
    assert respuesta.json()["sugerencia"] == {
        "filtro": "posicion",
        "etiqueta": "la posición",
        "cantidad": 1,
    }


def test_bus010_excluidos_sin_valor_cuenta_solo_a_los_que_coinciden(
    cliente_con_sesion, session, liga
):
    _jugador(session, ("S. Arias", "Santiago", "Arias"), liga=liga, valor=100_000)
    _jugador(session, ("R. Arias", "Ramiro", "Arias"), liga=liga)
    _jugador(session, CORREA, liga=liga)

    respuesta = _buscar(cliente_con_sesion, nombre="arias", presupuesto_max_eur=150_000)

    assert _nombres(respuesta) == ["S. Arias"]
    assert respuesta.json()["excluidos_sin_valor"] == 1


def test_bus010_excluidos_por_dato_faltante_cuenta_solo_a_los_que_coinciden(
    cliente_con_sesion, session, liga
):
    _jugador(session, ("S. Arias", "Santiago", "Arias"), liga=liga, pases_precision_pct=85)
    _jugador(session, ("R. Arias", "Ramiro", "Arias"), liga=liga)
    _jugador(session, CORREA, liga=liga)

    respuesta = _buscar(cliente_con_sesion, nombre="arias", pases_min=80)

    assert _nombres(respuesta) == ["S. Arias"]
    assert respuesta.json()["excluidos_por_dato_faltante"] == 1


def test_bus010_un_dato_faltante_se_devuelve_null_y_nunca_0(cliente_con_sesion, session, liga):
    _jugador(session, ARIAS, liga=liga)

    (jugador,) = _buscar(cliente_con_sesion, nombre="arias").json()["resultados"]

    assert jugador["pases_precision_pct"] is None
    assert jugador["minutos_jugados"] is None
    assert jugador["valor_mercado_eur"] is None


def test_bus010_un_jugador_sin_estadistica_vigente_no_aparece(cliente_con_sesion, session):
    crear_jugador(session, nombre="S. Arias", nombre_pila="Santiago", apellido="Arias")

    assert _nombres(_buscar(cliente_con_sesion, nombre="arias")) == []


def test_bus010_la_ficha_acepta_el_nombre_y_lo_ignora_en_la_coincidencia(
    cliente_con_sesion, session, liga
):
    estadistica = _jugador(session, ARIAS, liga=liga)

    respuesta = cliente_con_sesion.get(f"{URL}/{estadistica.jugador_id}", params={"nombre": "zzz"})

    assert respuesta.status_code == 200
    assert respuesta.json()["coincidencia"] is None


# --- La consulta en SQL da lo mismo que la regla en Python ---


@pytest.mark.parametrize(("texto", "esperados"), CASOS_RN035)
def test_bus010_ejemplo_de_rn035_en_la_consulta(
    cliente_con_sesion, session, liga, texto: str, esperados: list[str]
):
    for datos in JUGADORES_RN035:
        _jugador(session, datos, liga=liga)

    assert sorted(_nombres(_buscar(cliente_con_sesion, nombre=texto))) == sorted(esperados)


@pytest.mark.parametrize("texto", TEXTOS_DIFICILES)
def test_bus010_la_consulta_normaliza_igual_que_normalizar_nombre(
    cliente_con_sesion, session, liga, texto: str
):
    for datos in NOMBRES_DIFICILES:
        _jugador(session, datos, liga=liga)
    esperados = [
        nombre
        for nombre, nombre_pila, apellido in NOMBRES_DIFICILES
        if coincide_con_nombre(texto, nombre, nombre_pila, apellido)
    ]

    assert sorted(_nombres(_buscar(cliente_con_sesion, nombre=texto))) == sorted(esperados)
