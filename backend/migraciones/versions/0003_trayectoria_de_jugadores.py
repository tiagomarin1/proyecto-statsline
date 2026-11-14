"""Trayectoria de los jugadores (DAT-004): tabla `trayectoria` y su marca de sincronización.

- `trayectoria`: un jugador, un club y una temporada. El club no es una FK a `equipo`. El NULL de
  `temporada` cuenta como un valor más (dos índices únicos parciales).
- `jugador.trayectoria_sincronizada_en`: NULL = nunca se sincronizó (RN-034).
- `sincronizacion.origen` suma `api_football_trayectoria`.

Downgrade: borra las sincronizaciones de trayectoria y la tabla `trayectoria`.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ORIGENES_NUEVOS = "'api_football', 'transfermarkt', 'sportmonks', 'api_football_trayectoria'"
ORIGENES_ANTERIORES = "'api_football', 'transfermarkt', 'sportmonks'"


def upgrade() -> None:
    op.create_table(
        "trayectoria",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("jugador_id", sa.BigInteger(), nullable=False),
        sa.Column("id_club_api_football", sa.Integer(), nullable=False),
        sa.Column("nombre_club", sa.String(length=120), nullable=False),
        sa.Column("temporada", sa.SmallInteger(), nullable=True),
        sa.Column(
            "sincronizado_en",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "temporada BETWEEN 1900 AND 2100", name=op.f("ck_trayectoria_temporada_valida")
        ),
        sa.ForeignKeyConstraint(
            ["jugador_id"], ["jugador.id"], name=op.f("fk_trayectoria_jugador_id_jugador")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trayectoria")),
    )
    op.create_index(op.f("ix_trayectoria_jugador_id"), "trayectoria", ["jugador_id"], unique=False)
    op.create_index(
        "uq_trayectoria_jugador_club_temporada",
        "trayectoria",
        ["jugador_id", "id_club_api_football", "temporada"],
        unique=True,
        postgresql_where=sa.text("temporada IS NOT NULL"),
    )
    op.create_index(
        "uq_trayectoria_jugador_club_sin_temporada",
        "trayectoria",
        ["jugador_id", "id_club_api_football"],
        unique=True,
        postgresql_where=sa.text("temporada IS NULL"),
    )

    op.add_column("jugador", sa.Column("trayectoria_sincronizada_en", sa.DateTime(), nullable=True))

    # El VARCHAR de un enum tiene el largo del valor más largo: "api_football_trayectoria" (24)
    op.alter_column(
        "sincronizacion",
        "origen",
        existing_type=sa.String(length=13),
        type_=sa.String(length=24),
        existing_nullable=False,
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
    op.execute("DELETE FROM sincronizacion WHERE origen = 'api_football_trayectoria'")
    op.alter_column(
        "sincronizacion",
        "origen",
        existing_type=sa.String(length=24),
        type_=sa.String(length=13),
        existing_nullable=False,
    )
    op.drop_constraint(
        op.f("ck_sincronizacion_origen_sincronizacion"), "sincronizacion", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_sincronizacion_origen_sincronizacion"),
        "sincronizacion",
        f"origen IN ({ORIGENES_ANTERIORES})",
    )

    op.drop_column("jugador", "trayectoria_sincronizada_en")

    op.drop_index("uq_trayectoria_jugador_club_sin_temporada", table_name="trayectoria")
    op.drop_index("uq_trayectoria_jugador_club_temporada", table_name="trayectoria")
    op.drop_index(op.f("ix_trayectoria_jugador_id"), table_name="trayectoria")
    op.drop_table("trayectoria")
