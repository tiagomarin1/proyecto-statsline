"""DAT-003: el script que explora Sportmonks durante la prueba de 14 días y graba las respuestas."""

import json
from pathlib import Path

import httpx
import pytest

from app.integraciones.cliente_sportmonks import ClienteSportmonks
from app.sincronizacion import explorar_sportmonks
from app.sincronizacion.explorar_sportmonks import explorar, resumir_jugadores

TOKEN = "token-secreto-de-prueba"


def _jugador(id_: int, *, tipos: tuple[int, ...] = (119, 80), position_id: int | None = 25) -> dict:
    return {
        "id": id_,
        "name": f"Jugador {id_}",
        "date_of_birth": "1999-03-15",
        "position_id": position_id,
        "statistics": [
            {
                "team_id": 7,
                "season_id": 100,
                "position_id": position_id,
                "details": [{"type_id": tipo, "value": {"total": 10}} for tipo in tipos],
            }
        ],
    }


def test_dat003_resumir_cuenta_cuantos_jugadores_traen_cada_dato():
    jugadores = [
        _jugador(1, tipos=(119, 80, 105, 100, 118)),
        _jugador(2, tipos=(119,)),
        _jugador(3, tipos=(), position_id=None),
    ]

    resumen = resumir_jugadores(jugadores)

    assert resumen["jugadores"] == 3
    assert resumen["con_minutos"] == 2
    assert resumen["con_pases"] == 1
    assert resumen["con_duelos"] == 1
    assert resumen["con_intercepciones"] == 1
    assert resumen["con_rating"] == 1
    assert resumen["con_fecha_de_nacimiento"] == 3
    assert resumen["posiciones"] == {"25": 2, "sin_posicion": 1}


def test_dat003_resumir_sin_jugadores_no_falla():
    assert resumir_jugadores([])["jugadores"] == 0


def _transporte(pedidos: list[str]) -> httpx.MockTransport:
    def responder(pedido: httpx.Request) -> httpx.Response:
        pedidos.append(pedido.url.path)
        ruta = pedido.url.path
        if ruta.endswith("/leagues"):
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 1,
                            "name": "Primera Nacional",
                            "currentseason": {"id": 100},
                            "seasons": [{"id": 90, "name": "2025"}, {"id": 100, "name": "2026"}],
                        }
                    ],
                    "pagination": {"has_more": False},
                },
            )
        if "/teams/seasons/" in ruta:
            return httpx.Response(
                200,
                json={"data": [{"id": 7, "name": "Club A"}], "pagination": {"has_more": False}},
            )
        if "/squads/seasons/" in ruta:
            return httpx.Response(
                200, json={"data": [{"player_id": 11}, {"player_id": 12}, {"player_id": 13}]}
            )
        if ruta.endswith("/players"):
            return httpx.Response(
                200,
                json={
                    "data": [_jugador(11), _jugador(12)],
                    "pagination": {"count": 2, "has_more": True},
                },
            )
        if "/players/" in ruta:
            id_ = int(ruta.rsplit("/", 1)[1])
            return httpx.Response(200, json={"data": _jugador(id_, tipos=(119, 80))})
        return httpx.Response(404, json={})

    return httpx.MockTransport(responder)


def test_dat003_explorar_graba_las_respuestas_y_resume_cada_liga(tmp_path: Path):
    pedidos: list[str] = []
    with ClienteSportmonks(TOKEN, transporte=_transporte(pedidos)) as cliente:
        resumen = explorar(cliente, tmp_path, jugadores_por_liga=2, listado_general=True)

    [liga] = resumen["ligas"]
    assert liga["nombre"] == "Primera Nacional"
    assert liga["temporada"] == 100
    assert liga["equipos"] == 1
    assert liga["temporadas"] == [{"id": 100, "nombre": "2026"}, {"id": 90, "nombre": "2025"}]
    assert liga["muestra"]["jugadores"] == 2
    assert liga["masiva"]["jugadores"] == 2
    assert liga["masiva"]["hay_mas_paginas"] is True
    assert resumen["pedidos_usados"] == len(pedidos)
    # solo pide a 2 de los 3 jugadores del plantel
    assert sum(1 for ruta in pedidos if ruta.rsplit("/", 1)[-1] in {"11", "12", "13"}) == 2
    nombres = {archivo.name for archivo in tmp_path.iterdir()}
    assert {"ligas.json", "resumen.json"} <= nombres
    assert any(n.startswith("equipos_") for n in nombres)
    assert any(n.startswith("plantel_") for n in nombres)
    assert any(n.startswith("jugador_") for n in nombres)
    assert any(n.startswith("masiva_") for n in nombres)


def test_dat003_explorar_varios_equipos_y_sin_listado_general_por_defecto(tmp_path: Path):
    pedidos: list[str] = []
    with ClienteSportmonks(TOKEN, transporte=_transporte(pedidos)) as cliente:
        resumen = explorar(cliente, tmp_path, jugadores_por_liga=3, equipos_por_liga=2)

    assert "masiva" not in resumen["ligas"][0]
    assert not any(ruta.endswith("/players") for ruta in pedidos)
    # el mismo equipo no se repite si la liga tiene uno solo
    assert sum(1 for ruta in pedidos if "/squads/seasons/" in ruta) == 1


def test_dat003_resumir_cuenta_pases_acertados_y_porcentaje_directo():
    jugador = _jugador(1, tipos=(116, 1584))

    resumen = resumir_jugadores([jugador])

    assert resumen["con_pases_acertados"] == 1
    assert resumen["con_porcentaje_de_pases"] == 1


def test_dat003_lo_grabado_nunca_incluye_el_token(tmp_path: Path):
    with ClienteSportmonks(TOKEN, transporte=_transporte([])) as cliente:
        explorar(cliente, tmp_path, jugadores_por_liga=1)

    for archivo in tmp_path.iterdir():
        assert TOKEN not in archivo.read_text(encoding="utf-8")


def test_dat003_una_liga_sin_temporada_actual_se_informa_y_no_rompe(tmp_path: Path):
    def responder(pedido: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"data": [{"id": 2, "name": "Primera D"}], "pagination": {"has_more": False}},
        )

    with ClienteSportmonks(TOKEN, transporte=httpx.MockTransport(responder)) as cliente:
        resumen = explorar(cliente, tmp_path, jugadores_por_liga=1)

    assert resumen["ligas"][0]["temporada"] is None
    assert json.loads((tmp_path / "resumen.json").read_text(encoding="utf-8"))["ligas"]


def test_dat003_sin_token_el_script_termina_con_error(monkeypatch: pytest.MonkeyPatch, tmp_path):
    monkeypatch.setenv("SPORTMONKS_TOKEN", "")

    assert explorar_sportmonks.main(["--salida", str(tmp_path)]) == 1
