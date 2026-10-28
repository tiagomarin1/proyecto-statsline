"""Modelo canónico inicial en PostgreSQL: crea todas las tablas de MODELO_CANONICO_DE_DATOS.md.

Es la única migración de la fase 0 (PLAN_BACKEND.md). Se regeneró para PostgreSQL (ADR-0010)
antes de aplicarse en una base compartida. Desde acá, las migraciones aplicadas no se editan:
cualquier cambio va en una migración nueva.

Revision ID: 0001
Revises:
Create Date: 2026-10-28 07:57:26.246604
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "equipo",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("id_api_football", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_equipo")),
        sa.UniqueConstraint("id_api_football", name=op.f("uq_equipo_id_api_football")),
    )
    op.create_table(
        "jugador",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("id_api_football", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("nombre_pila", sa.String(length=80), nullable=True),
        sa.Column("apellido", sa.String(length=80), nullable=True),
        sa.Column("fecha_nacimiento", sa.Date(), nullable=True),
        sa.Column("nacionalidad", sa.String(length=60), nullable=True),
        sa.Column("valor_mercado_eur", sa.Integer(), nullable=True),
        sa.Column("id_transfermarkt", sa.Integer(), nullable=True),
        sa.Column("valor_mercado_fecha", sa.Date(), nullable=True),
        sa.Column(
            "actualizado_en",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "valor_mercado_eur >= 0", name=op.f("ck_jugador_valor_mercado_eur_no_negativo")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_jugador")),
        sa.UniqueConstraint("id_api_football", name=op.f("uq_jugador_id_api_football")),
        sa.UniqueConstraint("id_transfermarkt", name=op.f("uq_jugador_id_transfermarkt")),
    )
    op.create_index(
        op.f("ix_jugador_fecha_nacimiento"), "jugador", ["fecha_nacimiento"], unique=False
    )
    op.create_index(
        op.f("ix_jugador_valor_mercado_eur"), "jugador", ["valor_mercado_eur"], unique=False
    )
    op.create_table(
        "liga",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("id_api_football", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=80), nullable=False),
        sa.Column("temporada_actual", sa.SmallInteger(), nullable=False),
        sa.Column(
            "cobertura",
            sa.Enum(
                "completa",
                "basica",
                "sin_datos",
                name="cobertura",
                native_enum=False,
                create_constraint=True,
            ),
            server_default="sin_datos",
            nullable=False,
        ),
        sa.Column("orden", sa.SmallInteger(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_liga")),
        sa.UniqueConstraint("id_api_football", name=op.f("uq_liga_id_api_football")),
    )
    op.create_table(
        "usuario",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("hash_contrasena", sa.String(length=255), nullable=False),
        sa.Column(
            "rol",
            sa.Enum(
                "director_tecnico",
                "director_deportivo",
                "dirigente",
                "ojeador",
                name="rol",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("club", sa.String(length=120), nullable=False),
        sa.Column("terminos_aceptados_en", sa.DateTime(), nullable=False),
        sa.Column(
            "creado_en", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint("email = lower(email)", name=op.f("ck_usuario_email_en_minusculas")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuario")),
        sa.UniqueConstraint("email", name=op.f("uq_usuario_email")),
    )
    op.create_table(
        "estadistica_temporada",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("jugador_id", sa.BigInteger(), nullable=False),
        sa.Column("liga_id", sa.BigInteger(), nullable=False),
        sa.Column("equipo_id", sa.BigInteger(), nullable=False),
        sa.Column("temporada", sa.SmallInteger(), nullable=False),
        sa.Column(
            "posicion",
            sa.Enum(
                "arquero",
                "defensor",
                "mediocampista",
                "delantero",
                name="posicion",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=True,
        ),
        sa.Column("partidos_jugados", sa.SmallInteger(), nullable=True),
        sa.Column("minutos_jugados", sa.Integer(), nullable=True),
        sa.Column("goles", sa.SmallInteger(), nullable=True),
        sa.Column("asistencias", sa.SmallInteger(), nullable=True),
        sa.Column("pases_precision_pct", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("duelos_totales", sa.SmallInteger(), nullable=True),
        sa.Column("duelos_ganados", sa.SmallInteger(), nullable=True),
        sa.Column("rating", sa.Numeric(precision=4, scale=2), nullable=True),
        sa.Column("intercepciones", sa.SmallInteger(), nullable=True),
        sa.Column(
            "sincronizado_en",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "duelos_ganados <= duelos_totales",
            name=op.f("ck_estadistica_temporada_duelos_ganados_hasta_totales"),
        ),
        sa.CheckConstraint(
            "partidos_jugados >= 0 AND minutos_jugados >= 0 AND goles >= 0"
            " AND asistencias >= 0 AND duelos_totales >= 0 AND duelos_ganados >= 0"
            " AND intercepciones >= 0",
            name=op.f("ck_estadistica_temporada_contadores_no_negativos"),
        ),
        sa.CheckConstraint(
            "pases_precision_pct BETWEEN 0 AND 100",
            name=op.f("ck_estadistica_temporada_pases_precision_pct_rango"),
        ),
        sa.ForeignKeyConstraint(
            ["equipo_id"], ["equipo.id"], name=op.f("fk_estadistica_temporada_equipo_id_equipo")
        ),
        sa.ForeignKeyConstraint(
            ["jugador_id"], ["jugador.id"], name=op.f("fk_estadistica_temporada_jugador_id_jugador")
        ),
        sa.ForeignKeyConstraint(
            ["liga_id"], ["liga.id"], name=op.f("fk_estadistica_temporada_liga_id_liga")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_estadistica_temporada")),
        sa.UniqueConstraint(
            "jugador_id",
            "liga_id",
            "equipo_id",
            "temporada",
            name=op.f("uq_estadistica_temporada_jugador_id_liga_id_equipo_id_temporada"),
        ),
    )
    op.create_index(
        op.f("ix_estadistica_temporada_jugador_id"),
        "estadistica_temporada",
        ["jugador_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_estadistica_temporada_temporada_posicion_liga_id"),
        "estadistica_temporada",
        ["temporada", "posicion", "liga_id"],
        unique=False,
    )
    op.create_table(
        "perfil_busqueda",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "posicion",
            sa.Enum(
                "arquero",
                "defensor",
                "mediocampista",
                "delantero",
                name="posicion",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("liga_id", sa.BigInteger(), nullable=False),
        sa.Column("edad_min", sa.SmallInteger(), nullable=False),
        sa.Column("edad_max", sa.SmallInteger(), nullable=False),
        sa.Column("presupuesto_max_eur", sa.Integer(), nullable=True),
        sa.Column("pases_min", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("duelos_min", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("recuperaciones_min", sa.Numeric(precision=4, scale=2), nullable=True),
        sa.Column("minutos_min", sa.Integer(), nullable=True),
        sa.Column(
            "actualizado_en",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "edad_max BETWEEN 15 AND 45", name=op.f("ck_perfil_busqueda_edad_max_rango")
        ),
        sa.CheckConstraint(
            "edad_min <= edad_max", name=op.f("ck_perfil_busqueda_edad_min_hasta_edad_max")
        ),
        sa.CheckConstraint(
            "edad_min BETWEEN 15 AND 45", name=op.f("ck_perfil_busqueda_edad_min_rango")
        ),
        sa.CheckConstraint(
            "presupuesto_max_eur >= 0",
            name=op.f("ck_perfil_busqueda_presupuesto_max_eur_no_negativo"),
        ),
        sa.ForeignKeyConstraint(
            ["liga_id"], ["liga.id"], name=op.f("fk_perfil_busqueda_liga_id_liga")
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], name=op.f("fk_perfil_busqueda_usuario_id_usuario")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_perfil_busqueda")),
        sa.UniqueConstraint("usuario_id", name=op.f("uq_perfil_busqueda_usuario_id")),
    )
    op.create_table(
        "seguimiento",
        sa.Column("usuario_id", sa.BigInteger(), nullable=False),
        sa.Column("jugador_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "creado_en", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["jugador_id"], ["jugador.id"], name=op.f("fk_seguimiento_jugador_id_jugador")
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], name=op.f("fk_seguimiento_usuario_id_usuario")
        ),
        sa.PrimaryKeyConstraint("usuario_id", "jugador_id", name=op.f("pk_seguimiento")),
    )
    op.create_table(
        "sincronizacion",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "origen",
            sa.Enum(
                "api_football",
                "transfermarkt",
                name="origen_sincronizacion",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("liga_id", sa.BigInteger(), nullable=True),
        sa.Column("temporada", sa.SmallInteger(), nullable=True),
        sa.Column(
            "iniciada_en",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("finalizada_en", sa.DateTime(), nullable=True),
        sa.Column(
            "estado",
            sa.Enum(
                "en_curso",
                "ok",
                "error",
                name="estado_sincronizacion",
                native_enum=False,
                create_constraint=True,
            ),
            server_default="en_curso",
            nullable=False,
        ),
        sa.Column("pedidos_usados", sa.Integer(), server_default="0", nullable=False),
        sa.Column("registros_actualizados", sa.Integer(), server_default="0", nullable=False),
        sa.Column("mensaje_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["liga_id"], ["liga.id"], name=op.f("fk_sincronizacion_liga_id_liga")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sincronizacion")),
    )


def downgrade() -> None:
    op.drop_table("sincronizacion")
    op.drop_table("seguimiento")
    op.drop_table("perfil_busqueda")
    op.drop_index(
        op.f("ix_estadistica_temporada_temporada_posicion_liga_id"),
        table_name="estadistica_temporada",
    )
    op.drop_index(op.f("ix_estadistica_temporada_jugador_id"), table_name="estadistica_temporada")
    op.drop_table("estadistica_temporada")
    op.drop_table("usuario")
    op.drop_table("liga")
    op.drop_index(op.f("ix_jugador_valor_mercado_eur"), table_name="jugador")
    op.drop_index(op.f("ix_jugador_fecha_nacimiento"), table_name="jugador")
    op.drop_table("jugador")
    op.drop_table("equipo")
