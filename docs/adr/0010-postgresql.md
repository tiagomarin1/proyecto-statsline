# ADR-0010: PostgreSQL en lugar de MySQL

**Estado:** Aceptada (2026-10-28). Reemplaza el motor de ADR-0002 y la base de ADR-0009.

## Contexto
ADR-0002 eligió MySQL 8 porque el documento de MVP lo presupuestaba. Cuando INF-001 ya estaba mergeado, pero antes de crear la base de producción, el equipo decidió pasar a PostgreSQL porque lo conoce más. Todavía no hay datos reales ni una base de producción creada, así que es el momento más barato para cambiar.

Lo demás de ADR-0002 sigue igual: SQLAlchemy 2 en modo sync, Alembic para las migraciones y tests de integración contra el motor real, no contra SQLite.

## Opciones consideradas
1. **Seguir con MySQL 8:** ya estaba implementado y probado, pero el equipo lo conoce menos.
2. **PostgreSQL con psycopg 3:** es el motor que conoce el equipo, SQLAlchemy y Alembic lo soportan de primera, y Aiven también lo ofrece en su plan gratis (ADR-0009).

## Decisión
PostgreSQL 16, con el driver **psycopg 3** (`postgresql+psycopg://`).

| Tema | Cómo queda |
|---|---|
| Producción | **Aiven for PostgreSQL**, plan Free (ADR-0009): 1 GB, no vence y no pide tarjeta |
| Desarrollo y tests | `docker compose` con `postgres:16`, con las bases `statsline_dev` y `statsline_test`. El CI usa la misma imagen |
| Tipos | Los del modelo canónico pasados a PostgreSQL (ver `MODELO_CANONICO_DE_DATOS.md`). PostgreSQL no tiene `UNSIGNED`, así que las invariantes "≥ 0" van como `CHECK` |
| Enums | `VARCHAR` con un `CHECK` de valores permitidos, no tipos `ENUM` nativos, para no tener que crear y borrar tipos en cada migración |
| Fechas | `TIMESTAMP` sin zona, en UTC. Cada conexión fija `timezone=UTC` |
| Email único sin distinguir mayúsculas | Restricción única en `email`, más un `CHECK (email = lower(email))` |
| TLS en producción | `sslmode=verify-full`, con el CA de Aiven, que llega en `DATABASE_SSL_CA` |
| Bloqueo al arrancar (ADR-0009) | `pg_try_advisory_lock` en lugar del `GET_LOCK` de MySQL |

**La migración inicial `0001` se regenera para PostgreSQL.** Solo se había aplicado en bases locales y de CI, nunca en una base compartida ni de producción, así que reemplazarla no rompe nada. Desde acá vale la regla de siempre: las migraciones aplicadas no se editan.

## Consecuencias
+ El equipo trabaja con el motor que conoce.
+ El cambio no toca la API, las reglas de negocio ni el frontend: solo la capa de datos y el entorno.
+ PostgreSQL hace cumplir los `CHECK` y da mensajes de error más claros.
- Hay que reinstalar el entorno local: `docker compose` ahora levanta PostgreSQL y las URLs cambian (ver `SETUP.md`).
- Aiven Free tiene las mismas limitaciones que para MySQL (ADR-0009): 1 CPU, 1 GB de disco y sin SLA.
