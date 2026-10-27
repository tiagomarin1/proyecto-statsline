# ADR-0002: MySQL 8 + SQLAlchemy 2 + Alembic

**Estado:** Aceptada (2026-10-27)

## Contexto
El documento de MVP ya presupuesta MySQL. Hace falta un ORM y migraciones versionadas.

## Opciones consideradas
1. **SQLAlchemy 2 (sync) + Alembic:** es el estándar maduro y Alembic genera migraciones a partir de los modelos.
2. **SQLModel:** menos código repetido, pero es más joven y ante casos raros termina siendo SQLAlchemy igual.
3. **SQL a mano:** sin abstracción, pero cuesta más mantener la consistencia con el modelo canónico.

## Decisión
SQLAlchemy 2 en modo sync, con PyMySQL como driver y Alembic para las migraciones. Los tests de integración corren contra **MySQL real** en Docker, no contra SQLite, para no tener diferencias de motor.

## Consecuencias
+ El esquema es reproducible y cada migración se revisa en el PR.
- Para los tests de integración hace falta Docker.
