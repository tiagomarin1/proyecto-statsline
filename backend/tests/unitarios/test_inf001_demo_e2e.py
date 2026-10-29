"""INF-001: el seed del E2E de la demo solo corre contra una base local (TESTING_STRATEGY.md).

Pisa los valores de mercado de todos los jugadores, así que no puede correr contra Aiven aunque
ENTORNO diga "desarrollo" (por ejemplo, con el .env que se usa para importar Transfermarkt).
"""

import pytest

from semillas.demo_e2e import ErrorBaseNoLocal, verificar_base_local


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://statsline:statsline@localhost:5432/statsline_dev",
        "postgresql+psycopg://statsline:statsline@127.0.0.1:5432/statsline_e2e",
        "postgresql+psycopg://statsline:statsline@postgres:5432/statsline",
    ],
)
def test_inf001_el_seed_de_la_demo_corre_contra_una_base_local(url):
    verificar_base_local(url, entorno="desarrollo")


def test_inf001_el_seed_de_la_demo_no_corre_contra_aiven():
    url = "postgresql+psycopg://avnadmin:x@statsline-pg.aivencloud.com:12345/defaultdb"

    with pytest.raises(ErrorBaseNoLocal, match="local"):
        verificar_base_local(url, entorno="desarrollo")


def test_inf001_el_seed_de_la_demo_no_corre_en_produccion_aunque_la_base_sea_local():
    url = "postgresql+psycopg://statsline:statsline@localhost:5432/statsline"

    with pytest.raises(ErrorBaseNoLocal, match="producción"):
        verificar_base_local(url, entorno="produccion")
