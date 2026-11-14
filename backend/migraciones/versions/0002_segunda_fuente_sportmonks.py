"""Segunda fuente de datos: Sportmonks (ADR-0011, propuesta; DAT-003).

- `liga.id_sportmonks` y `liga.fuente`: de dónde salen las estadísticas de cada liga (RN-029).
  Todas las ligas arrancan en `api_football`: nada cambia hasta que se pase una liga a Sportmonks.
- `equipo.id_sportmonks` y `jugador.id_sportmonks`.
- `equipo.id_api_football` y `jugador.id_api_football` pasan a ser opcionales, porque un equipo o
  un jugador que solo existe en Sportmonks no tiene id de API-Football. Un CHECK exige al menos
  uno de los dos ids.
- `sincronizacion.origen` suma `sportmonks`.

Downgrade: borra las sincronizaciones de Sportmonks y falla si quedan jugadores o equipos sin
`id_api_football`, porque no se puede volver a hacerlo obligatorio.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ORIGENES_NUEVOS = "'api_football', 'transfermarkt', 'sportmonks'"
ORIGENES_ANTERIORES = "'api_football', 'transfermarkt'"
UNO_DE_LOS_DOS_IDS = "id_api_football IS NOT NULL OR id_sportmonks IS NOT NULL"


def upgrade() -> None:
    op.add_column("liga", sa.Column("id_sportmonks", sa.Integer(), nullable=True))
    op.add_column(
        "liga",
        sa.Column("fuente", sa.String(length=12), server_default="api_football", nullable=False),
    )
    op.create_unique_constraint(op.f("uq_liga_id_sportmonks"), "liga", ["id_sportmonks"])
    op.create_check_constraint(
        op.f("ck_liga_fuente_datos"), "liga", "fuente IN ('api_football', 'sportmonks')"
    )

    for tabla in ("equipo", "jugador"):
        op.add_column(tabla, sa.Column("id_sportmonks", sa.Integer(), nullable=True))
        op.alter_column(tabla, "id_api_football", existing_type=sa.Integer(), nullable=True)
        op.create_unique_constraint(op.f(f"uq_{tabla}_id_sportmonks"), tabla, ["id_sportmonks"])
        op.create_check_constraint(
            op.f(f"ck_{tabla}_tiene_id_de_fuente"), tabla, UNO_DE_LOS_DOS_IDS
        )

    op.drop_constraint(
        op.f("ck_sincronizacion_origen_sincronizacion"), "sincronizacion", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_sincronizacion_origen_sincronizacion"),
        "sincronizacion",
        f"origen IN ({ORIGENES_NUEVOS})",
    )


def downgrade() -> None:
    op.execute("DELETE FROM sincronizacion WHERE origen = 'sportmonks'")
    op.drop_constraint(
        op.f("ck_sincronizacion_origen_sincronizacion"), "sincronizacion", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_sincronizacion_origen_sincronizacion"),
        "sincronizacion",
        f"origen IN ({ORIGENES_ANTERIORES})",
    )

    for tabla in ("jugador", "equipo"):
        op.drop_constraint(op.f(f"ck_{tabla}_tiene_id_de_fuente"), tabla, type_="check")
        op.drop_constraint(op.f(f"uq_{tabla}_id_sportmonks"), tabla, type_="unique")
        op.alter_column(tabla, "id_api_football", existing_type=sa.Integer(), nullable=False)
        op.drop_column(tabla, "id_sportmonks")

    op.drop_constraint(op.f("ck_liga_fuente_datos"), "liga", type_="check")
    op.drop_constraint(op.f("uq_liga_id_sportmonks"), "liga", type_="unique")
    op.drop_column("liga", "fuente")
    op.drop_column("liga", "id_sportmonks")
