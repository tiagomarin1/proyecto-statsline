"""INF-001: configuración por variables de entorno."""

from app.config import Configuracion


def test_inf001_la_url_mysql_de_railway_pasa_a_usar_pymysql():
    configuracion = Configuracion(
        database_url="mysql://usuario:clave@host:3306/railway", secret_key="x"
    )

    assert configuracion.database_url == "mysql+pymysql://usuario:clave@host:3306/railway"


def test_inf001_la_url_con_pymysql_no_se_modifica():
    url = "mysql+pymysql://statsline:statsline@localhost:3306/statsline_dev"

    assert Configuracion(database_url=url, secret_key="x").database_url == url
