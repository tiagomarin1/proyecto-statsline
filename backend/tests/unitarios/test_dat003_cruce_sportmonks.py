"""DAT-003: cruce de los jugadores de Sportmonks con la base por nombre y nacimiento (RN-030)."""

from datetime import date

import pytest

from app.servicios.cruce_sportmonks import (
    JugadorExistente,
    JugadorSportmonks,
    MotivoNuevo,
    TipoCruce,
    cruzar_jugadores,
)

NACIMIENTO = date(1999, 3, 15)


def _sm(
    id_sm=700_001,
    *,
    nombre="Lucas Martínez",
    nombre_pila="Lucas",
    apellido="Martínez",
    fecha=NACIMIENTO,
):
    return JugadorSportmonks(
        id_sportmonks=id_sm,
        nombre=nombre,
        nombre_pila=nombre_pila,
        apellido=apellido,
        fecha_nacimiento=fecha,
    )


def _base(
    id_=1,
    *,
    nombre="L. Martinez",
    nombre_pila="Lucas",
    apellido="Martinez",
    fecha=NACIMIENTO,
    id_sportmonks=None,
):
    return JugadorExistente(
        id=id_,
        nombre=nombre,
        nombre_pila=nombre_pila,
        apellido=apellido,
        fecha_nacimiento=fecha,
        id_sportmonks=id_sportmonks,
    )


def test_dat003_un_jugador_con_el_mismo_nombre_y_nacimiento_se_cruza():
    cruces = cruzar_jugadores([_sm()], [_base(7)])

    resultado = cruces[700_001]
    assert resultado.tipo == TipoCruce.cruzado
    assert resultado.jugador_id == 7


def test_dat003_el_cruce_ignora_tildes_mayusculas_y_signos():
    cruces = cruzar_jugadores(
        [_sm(nombre="NICOLÁS O'Neill", nombre_pila="NICOLÁS", apellido="O'Neill")],
        [_base(3, nombre="N. Oneill", nombre_pila="Nicolas", apellido="O Neill")],
    )

    assert cruces[700_001].tipo == TipoCruce.cruzado


def test_dat003_tambien_cruza_si_coincide_el_nombre_para_mostrar():
    cruces = cruzar_jugadores(
        [_sm(nombre="Lucas Martínez", nombre_pila=None, apellido=None)],
        [_base(9, nombre="Lucas Martinez", nombre_pila=None, apellido=None)],
    )

    assert cruces[700_001].jugador_id == 9


def test_dat003_si_ya_tiene_id_sportmonks_se_reconoce_sin_mirar_el_nombre():
    cruces = cruzar_jugadores(
        [_sm(nombre="Otro Nombre Distinto", nombre_pila="Otro", apellido="Distinto")],
        [_base(5, nombre="L. Martinez", id_sportmonks=700_001)],
    )

    assert cruces[700_001].tipo == TipoCruce.existente
    assert cruces[700_001].jugador_id == 5


def test_dat003_sin_coincidencia_es_un_jugador_nuevo():
    cruces = cruzar_jugadores([_sm()], [_base(2, nombre_pila="Mateo", apellido="Pérez")])

    assert cruces[700_001].tipo == TipoCruce.nuevo
    assert cruces[700_001].motivo == MotivoNuevo.sin_coincidencia
    assert cruces[700_001].jugador_id is None


def test_dat003_con_otra_fecha_de_nacimiento_no_se_cruza():
    cruces = cruzar_jugadores([_sm()], [_base(2, fecha=date(1999, 3, 16))])

    assert cruces[700_001].tipo == TipoCruce.nuevo
    assert cruces[700_001].motivo == MotivoNuevo.sin_coincidencia


@pytest.mark.parametrize("de_quien", ["sportmonks", "base"])
def test_dat003_sin_fecha_de_nacimiento_no_se_cruza(de_quien):
    sportmonks = _sm(fecha=None if de_quien == "sportmonks" else NACIMIENTO)
    base = _base(2, fecha=None if de_quien == "base" else NACIMIENTO)

    cruces = cruzar_jugadores([sportmonks], [base])

    assert cruces[700_001].tipo == TipoCruce.nuevo
    expected = MotivoNuevo.sin_fecha if de_quien == "sportmonks" else MotivoNuevo.sin_coincidencia
    assert cruces[700_001].motivo == expected


def test_dat003_con_dos_candidatos_en_la_base_es_ambiguo_y_se_crea_uno_nuevo():
    cruces = cruzar_jugadores([_sm()], [_base(1), _base(2)])

    assert cruces[700_001].tipo == TipoCruce.nuevo
    assert cruces[700_001].motivo == MotivoNuevo.ambiguo


def test_dat003_si_dos_jugadores_de_sportmonks_cruzan_con_el_mismo_existente_ambos_son_nuevos():
    cruces = cruzar_jugadores(
        [_sm(700_001), _sm(700_002)],
        [_base(1)],
    )

    assert all(c.tipo == TipoCruce.nuevo for c in cruces.values())
    assert all(c.motivo == MotivoNuevo.ambiguo for c in cruces.values())


def test_dat003_un_existente_que_ya_tiene_otro_id_sportmonks_no_se_reasigna():
    cruces = cruzar_jugadores([_sm(700_001)], [_base(1, id_sportmonks=999_999)])

    assert cruces[700_001].tipo == TipoCruce.nuevo
    assert cruces[700_001].motivo == MotivoNuevo.sin_coincidencia


def test_dat003_se_resuelven_varios_jugadores_a_la_vez():
    cruces = cruzar_jugadores(
        [
            _sm(700_001),
            _sm(
                700_002,
                nombre="Mateo Pérez",
                nombre_pila="Mateo",
                apellido="Pérez",
                fecha=date(2000, 1, 1),
            ),
        ],
        [_base(1), _base(2, nombre_pila="Mateo", apellido="Perez", fecha=date(2000, 1, 1))],
    )

    assert (cruces[700_001].jugador_id, cruces[700_002].jugador_id) == (1, 2)
